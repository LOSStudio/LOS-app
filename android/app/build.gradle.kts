plugins {
    id("com.android.application")
}

android {
    namespace = "com.losstudio.studio2026"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.losstudio.studio2026"
        minSdk = 24
        targetSdk = 35
        versionCode = 3
        versionName = "1.2"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}
