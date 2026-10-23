// Конвейер Jenkins: сборка → автотесты и покрытие → анализ SonarQube/SonarCloud → Quality Gate → отчёты.
//
// Что нужно в Jenkins (Manage Jenkins):
//   Plugins:  Pipeline, Git, JUnit, JaCoCo, SonarQube Scanner, Allure Jenkins Plugin
//   Tools:    JDK с именем  'jdk21',  Maven с именем  'maven3',  Allure Commandline с именем 'allure'
//   System → SonarQube servers:  имя 'SonarCloud', URL https://sonarcloud.io, токен из Credentials (Secret text)
//   (для своего SonarQube укажите его URL и удалите sonar.organization в pom.xml)
//
// Создание задачи: New Item → Pipeline → Pipeline script from SCM → Git →
//   https://github.com/ravshanbekrakhmetullayev-ui/java-calculator.git, ветка main, Script Path: Jenkinsfile

pipeline {
    agent any

    tools {
        jdk 'jdk21'
        maven 'maven3'
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    triggers {
        // Проверять репозиторий каждые 5 минут (или настройте webhook GitHub → Jenkins)
        pollSCM('H/5 * * * *')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Сборка') {
            steps {
                sh 'mvn -B clean compile'
            }
        }

        stage('Автотесты и покрытие') {
            steps {
                sh 'mvn -B verify -Dmaven.test.failure.ignore=true'
            }
            post {
                always {
                    junit testResults: 'target/surefire-reports/*.xml', allowEmptyResults: false
                    jacoco execPattern: 'target/jacoco.exec',
                           classPattern: 'target/classes',
                           sourcePattern: 'src/main/java'
                }
            }
        }

        stage('Анализ кода (Sonar)') {
            steps {
                withSonarQubeEnv('SonarCloud') {
                    sh 'mvn -B org.sonarsource.scanner.maven:sonar-maven-plugin:sonar'
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    // Сборка падает, если код не прошёл Quality Gate
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }

    post {
        always {
            allure includeProperties: false,
                   commandline: 'allure',
                   results: [[path: 'target/allure-results']]
            archiveArtifacts artifacts: 'target/site/jacoco/**', allowEmptyArchive: true
        }
        unstable {
            echo 'Есть упавшие тесты — подробности в отчёте Allure'
        }
    }
}
