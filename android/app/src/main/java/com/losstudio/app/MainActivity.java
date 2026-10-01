package com.losstudio.studio2026;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Map;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final String APP_URL = "https://losstudio.github.io/LOS-app/";

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    private static boolean isSupabaseUrl(String url) {
        try {
            Uri uri = Uri.parse(url);
            String host = uri.getHost();
            return "https".equalsIgnoreCase(uri.getScheme())
                    && host != null
                    && host.toLowerCase().matches("[a-z0-9-]+\\.supabase\\.co");
        } catch (Exception ignored) {
            return false;
        }
    }

    public static class SupabaseBridge {
        @JavascriptInterface
        public String request(String url, String requestJson) {
            if (!isSupabaseUrl(url)) {
                return "{\"error\":\"Blocked native request: non-Supabase URL\"}";
            }

            Exception lastError = null;
            for (int attempt = 0; attempt < 2; attempt++) {
                HttpURLConnection connection = null;
                try {
                    JSONObject request = new JSONObject(requestJson == null ? "{}" : requestJson);
                    String method = request.optString("method", "GET").toUpperCase();
                    JSONObject headers = request.optJSONObject("headers");
                    String body = request.optString("body", "");

                    connection = (HttpURLConnection) new URL(url).openConnection();
                    connection.setRequestMethod(method);
                    connection.setConnectTimeout(20000);
                    connection.setReadTimeout(45000);
                    connection.setUseCaches(false);
                    connection.setInstanceFollowRedirects(true);
                    // Avoid Android connection reuse/transparent gzip paths that can
                    // abort long Supabase REST requests with "Software caused connection abort".
                    connection.setRequestProperty("Connection", "close");
                    connection.setRequestProperty("Accept-Encoding", "identity");
                    connection.setRequestProperty("User-Agent", "LOS-Studio-Android/1.3");

                    if (headers != null) {
                        Iterator<String> keys = headers.keys();
                        while (keys.hasNext()) {
                            String key = keys.next();
                            String value = headers.optString(key, "");
                            if ("host".equalsIgnoreCase(key)
                                    || "content-length".equalsIgnoreCase(key)
                                    || "connection".equalsIgnoreCase(key)
                                    || "accept-encoding".equalsIgnoreCase(key)
                                    || "user-agent".equalsIgnoreCase(key)) {
                                continue;
                            }
                            connection.setRequestProperty(key, value);
                        }
                    }

                    if (!body.isEmpty()
                            && !"GET".equals(method)
                            && !"HEAD".equals(method)) {
                        connection.setDoOutput(true);
                        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                        connection.setFixedLengthStreamingMode(bytes.length);
                        connection.getOutputStream().write(bytes);
                        connection.getOutputStream().close();
                    }

                    int status = connection.getResponseCode();
                    InputStream stream = status >= 400
                            ? connection.getErrorStream()
                            : connection.getInputStream();

                    String responseBody = "";
                    if (stream != null) {
                        try (BufferedReader reader = new BufferedReader(
                                new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                            StringBuilder out = new StringBuilder();
                            String line;
                            while ((line = reader.readLine()) != null) {
                                out.append(line).append('\n');
                            }
                            responseBody = out.toString();
                            if (responseBody.endsWith("\n")) {
                                responseBody = responseBody.substring(0, responseBody.length() - 1);
                            }
                        }
                    }

                    JSONObject response = new JSONObject();
                    response.put("status", status);
                    response.put("statusText", connection.getResponseMessage() == null
                            ? "" : connection.getResponseMessage());

                    JSONObject responseHeaders = new JSONObject();
                    for (Map.Entry<String, java.util.List<String>> entry : connection.getHeaderFields().entrySet()) {
                        String key = entry.getKey();
                        if (key == null || entry.getValue() == null || entry.getValue().isEmpty()) {
                            continue;
                        }
                        responseHeaders.put(key, String.join(", ", entry.getValue()));
                    }

                    response.put("headers", responseHeaders);
                    response.put("body", responseBody);
                    return response.toString();
                } catch (Exception e) {
                    lastError = e;
                    if (attempt == 0) {
                        try { Thread.sleep(250); } catch (InterruptedException ignored) {
                            Thread.currentThread().interrupt();
                        }
                    }
                } finally {
                    if (connection != null) {
                        connection.disconnect();
                    }
                }
            }

            try {
                return new JSONObject()
                        .put("error", "Native Supabase request failed: "
                                + (lastError == null ? "unknown error" : lastError.getMessage()))
                        .toString();
            } catch (Exception ignored) {
                return "{\"error\":\"Native Supabase request failed\"}";
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);

        if (android.os.Build.VERSION.SDK_INT >= 21) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        if (android.os.Build.VERSION.SDK_INT >= 21) {
            cookies.setAcceptThirdPartyCookies(webView, true);
        }

        webView.addJavascriptInterface(new SupabaseBridge(), "AndroidSupabase");
        webView.setWebViewClient(new WebViewClient());

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params) {

                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                try {
                    Intent intent = params.createIntent();
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (Exception ignored) {
            }
        });

        webView.loadUrl(APP_URL);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
