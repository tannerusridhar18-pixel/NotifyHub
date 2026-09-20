// NotifyHub CI pipeline - for Jenkins on Windows, no Docker needed.
// Repo layout: /backend (Spring Boot + Maven, Java 21)   /frontend (React + Vite + TypeScript)
// Backend tests use the MySQL already installed on this machine (separate notifyhub_test database).

pipeline {
    agent any

    tools {
        // Names must match Manage Jenkins -> Tools
        jdk    'JDK-25'
        nodejs 'Node-24'
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '3'))
    }

    // Jenkins runs on localhost, so GitHub webhooks can't reach it; poll instead.
    triggers { pollSCM('H/5 * * * *') }

    environment {
        CI = 'true'
        // Spring Boot picks up SPRING_DATASOURCE_* env vars automatically.
        // Username/password come from the 'notifyhub-mysql' Jenkins credential (see below).
        SPRING_DATASOURCE_URL = 'jdbc:mysql://127.0.0.1:3306/notifyhub_test?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                bat 'git log -1 --pretty="%%h %%s"'
            }
        }

        stage('Build & Test') {
            parallel {

                stage('Backend') {
                    steps {
                        withCredentials([usernamePassword(
                                credentialsId: 'notifyhub-mysql',
                                usernameVariable: 'SPRING_DATASOURCE_USERNAME',
                                passwordVariable: 'SPRING_DATASOURCE_PASSWORD')]) {
                            dir('backend') {
                                bat 'mvn -B -q verify'
                            }
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml'
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            bat 'npm ci --prefer-offline --no-audit --no-fund'
                            bat 'npx tsc --noEmit'
                            bat 'npm run lint --if-present'
                            bat 'npm run build'
                        }
                    }
                }
            }
        }

        stage('Package') {
            steps {
                dir('backend') {
                    bat 'mvn -B -q package -DskipTests'
                }
                archiveArtifacts artifacts: 'backend/target/*.jar, frontend/dist/**', fingerprint: true
            }
        }
    }

    post {
        success { echo 'NotifyHub build passed.' }
        failure { echo 'NotifyHub build failed. Check the failing stage above.' }
    }
}