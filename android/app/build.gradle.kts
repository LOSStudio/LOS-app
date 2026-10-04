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
        versionCode = 9
        versionName = "1.8"
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
