plugins {
    id("com.android.application")
}

android {
    namespace = "com.losstudio.losstudio"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.losstudio.losstudio"
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "1.1"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}
