package com.losstudio.studio2026;

import android.app.Activity;
import android.content.Intent;
import android.content.ClipData;
import android.provider.MediaStore;
import androidx.core.content.FileProvider;
import java.io.File;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintJob;
import android.print.PrintManager;
import android.widget.Toast;
import android.util.Base64;
import java.io.OutputStream;
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
    private static final int SAVE_DOCUMENT_REQUEST = 1002;
    private Uri cameraPhotoUri;
    private byte[] pendingDownload;
    private static final String APP_URL = "https://losstudio.github.io/LOS-app/";

    private WebView webView;
    private WebView printView;
    private PrintJob printJob;
    private boolean preparingPrint;
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
        private final WebView target;
        public SupabaseBridge(WebView target) { this.target = target; }
        @JavascriptInterface
        public void requestAsync(String id, String url, String requestJson) {
            new Thread(() -> {
                String result = request(url, requestJson);
                target.post(() -> target.evaluateJavascript(
                        "window.__losNativeResponse && window.__losNativeResponse("
                        + JSONObject.quote(id) + "," + JSONObject.quote(result) + ")", null));
            }).start();
        }

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

        webView.addJavascriptInterface(new SupabaseBridge(webView), "AndroidSupabase");
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void printHtml(String html, String title) {
                if (html == null || html.length() > 20000000) return;
                runOnUiThread(() -> printDocument(html, title));
            }
        }, "AndroidPrint");
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void saveFile(String data, String mime, String name) {
                if (data == null || data.length() > 70000000) return;
                final byte[] bytes;
                try { bytes = Base64.decode(data, Base64.DEFAULT); }
                catch (IllegalArgumentException error) { return; }
                runOnUiThread(() -> {
                    if (pendingDownload != null) {
                        Toast.makeText(MainActivity.this, "Finish saving the current file first.", Toast.LENGTH_LONG).show();
                        return;
                    }
                    pendingDownload = bytes;
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                    intent.putExtra(Intent.EXTRA_TITLE, name == null || name.isEmpty() ? "LOS-Studio-file" : name.replaceAll("[\\\\/]", "_"));
                    try { startActivityForResult(intent, SAVE_DOCUMENT_REQUEST); }
                    catch (Exception error) {
                        pendingDownload = null;
                        Toast.makeText(MainActivity.this, "Could not open the file saver.", Toast.LENGTH_LONG).show();
                    }
                });
            }
        }, "AndroidDownload");
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
                    Intent intent;
                    if (params.isCaptureEnabled()) {
                        File directory = new File(getCacheDir(), "inventory-camera");
                        directory.mkdirs();
                        // Previous captures are temporary; the web app stores its own photo copy.
                        File[] oldPhotos = directory.listFiles();
                        if (oldPhotos != null) for (File old : oldPhotos) old.delete();
                        File photo = File.createTempFile("inventory-", ".jpg", directory);
                        cameraPhotoUri = FileProvider.getUriForFile(MainActivity.this,
                                getPackageName() + ".camera", photo);
                        intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
                        intent.setClipData(ClipData.newRawUri("Inventory photo", cameraPhotoUri));
                        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    } else {
                        cameraPhotoUri = null;
                        intent = params.createIntent();
                    }
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception e) {
                    filePathCallback.onReceiveValue(null);
                    filePathCallback = null;
                    cameraPhotoUri = null;
                    Toast.makeText(MainActivity.this, "Camera or file picker unavailable. Please use Add image.", Toast.LENGTH_LONG).show();
                    return true;
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

    private void printDocument(String html, String title) {
        if (preparingPrint || (printJob != null && !printJob.isCompleted()
                && !printJob.isCancelled() && !printJob.isFailed())) {
            Toast.makeText(this, "Finish or cancel the current print job first.", Toast.LENGTH_LONG).show();
            return;
        }
        if (printView != null) printView.destroy();
        preparingPrint = true;
        printView = new WebView(this);
        printView.getSettings().setJavaScriptEnabled(false);
        final String jobName = title == null || title.trim().isEmpty() ? "LOS Studio Document" : title;
        printView.setWebViewClient(new WebViewClient() {
            private boolean started;
            @Override
            public void onPageFinished(WebView view, String url) {
                if (started || isFinishing()) return;
                started = true;
                preparingPrint = false;
                PrintManager manager = (PrintManager) getSystemService(PRINT_SERVICE);
                if (manager == null) {
                    Toast.makeText(MainActivity.this, "Android print service is unavailable.", Toast.LENGTH_LONG).show();
                    return;
                }
                printJob = manager.print(jobName, view.createPrintDocumentAdapter(jobName),
                        new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
            }
        });
        printView.loadDataWithBaseURL(APP_URL, html, "text/html", "UTF-8", null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == SAVE_DOCUMENT_REQUEST) {
            final byte[] bytes = pendingDownload;
            pendingDownload = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null && bytes != null) {
                final Uri destination = data.getData();
                new Thread(() -> {
                    try (OutputStream output = getContentResolver().openOutputStream(destination)) {
                        if (output == null) throw new java.io.IOException("File unavailable");
                        output.write(bytes);
                        runOnUiThread(() -> Toast.makeText(this, "File saved.", Toast.LENGTH_SHORT).show());
                    } catch (Exception error) {
                        runOnUiThread(() -> Toast.makeText(this, "Could not save the file. Please retry.", Toast.LENGTH_LONG).show());
                    }
                }).start();
            }
        }
        if (requestCode == FILE_CHOOSER_REQUEST) {
            Uri[] results = cameraPhotoUri != null
                    ? (resultCode == RESULT_OK ? new Uri[]{cameraPhotoUri} : null)
                    : WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            cameraPhotoUri = null;
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
        if (printView != null) printView.destroy();
        super.onDestroy();
    }
}
