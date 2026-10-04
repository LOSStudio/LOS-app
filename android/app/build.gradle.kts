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
        versionCode = 10
        versionName = "1.9"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}

dependencies {
    implementation("androidx.core:core:1.13.1")
}
