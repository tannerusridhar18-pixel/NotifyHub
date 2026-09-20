// NotifyHub CI pipeline
// Assumed repo layout:  /backend (Spring Boot, Maven)   /frontend (React + Vite + TS)
// Assumed agent: Linux with Docker (for a throwaway MySQL used by backend tests)

pipeline {
    agent any

    tools {
        // Names must match Manage Jenkins -> Tools
        jdk    'JDK17'
        maven  'Maven3'
        nodejs 'Node20'
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '3'))
    }

    parameters {
        booleanParam(name: 'DEPLOY', defaultValue: false, description: 'Deploy after a successful build (main branch only)')
    }

    environment {
        CI                = 'true'
        MYSQL_CONTAINER   = "notifyhub-mysql-${env.BUILD_NUMBER}"
        MYSQL_PORT        = '3307'
        MYSQL_DB          = 'notifyhub_test'
        MYSQL_PASSWORD    = 'testpass'
        // Spring Boot reads these env vars automatically
        SPRING_DATASOURCE_URL      = "jdbc:mysql://127.0.0.1:3307/notifyhub_test?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
        SPRING_DATASOURCE_USERNAME = 'root'
        SPRING_DATASOURCE_PASSWORD = 'testpass'
        MAVEN_OPTS                 = '-Dmaven.repo.local=.m2/repository'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --pretty="%h %s"'
            }
        }

        stage('Build & Test') {
            parallel {

                stage('Backend') {
                    steps {
                        // Throwaway MySQL so Flyway migrations and JPA tests run against the real engine
                        sh '''
                            docker run -d --name "$MYSQL_CONTAINER" \
                              -e MYSQL_ROOT_PASSWORD="$MYSQL_PASSWORD" \
                              -e MYSQL_DATABASE="$MYSQL_DB" \
                              -p "$MYSQL_PORT":3306 mysql:8.0 >/dev/null

                            for i in $(seq 1 30); do
                              docker exec "$MYSQL_CONTAINER" mysqladmin ping -h127.0.0.1 -p"$MYSQL_PASSWORD" --silent && break
                              sleep 2
                            done
                        '''
                        dir('backend') {
                            sh 'mvn -B -q verify'
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml'
                            sh 'docker rm -f "$MYSQL_CONTAINER" || true'
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci --prefer-offline --no-audit --no-fund'
                            sh 'npx tsc --noEmit'
                            sh 'npm run lint --if-present'
                            sh 'npm run build'
                        }
                    }
                }
            }
        }

        stage('Package') {
            steps {
                dir('backend') {
                    sh 'mvn -B -q package -DskipTests'
                }
                archiveArtifacts artifacts: 'backend/target/*.jar, frontend/dist/**', fingerprint: true
            }
        }

        stage('Deploy') {
            when {
                allOf {
                    branch 'main'
                    expression { params.DEPLOY }
                }
            }
            steps {
                input message: 'Deploy NotifyHub to production?', ok: 'Deploy'
                // TODO: replace with your real deployment. Example using SSH:
                // sshagent(credentials: ['notifyhub-server-ssh']) {
                //     sh '''
                //         scp backend/target/*.jar user@your-server:/opt/notifyhub/app.jar
                //         scp -r frontend/dist/* user@your-server:/var/www/notifyhub/
                //         ssh user@your-server "sudo systemctl restart notifyhub"
                //     '''
                // }
                echo 'Deploy step not configured yet.'
            }
        }
    }

    post {
        success { echo 'NotifyHub build passed.' }
        failure { echo 'NotifyHub build failed. Check the failing stage above.' }
        cleanup {
            sh 'docker rm -f "$MYSQL_CONTAINER" || true'
            cleanWs(deleteDirs: true, patterns: [[pattern: 'frontend/node_modules', type: 'EXCLUDE']])
        }
    }
}