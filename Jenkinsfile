#!/usr/bin/env groovy

@Library('sec_ci_libs@v2-latest') _
def master_branches = ["master", "jgieseke/add-release-to-jenkinsfile-nopr"] as String[]

pipeline {
  agent {
    dockerfile {
      args  '--shm-size=2g'
    }
  }

  parameters {
    booleanParam(defaultValue: false, description: 'Release new DC/OS UI version?', name: 'CREATE_VERSION')
  }

  environment {
    JENKINS_VERSION = 'yes'
    NODE_PATH = 'node_modules'
    INSTALLER_URL= 'https://downloads.dcos.io/dcos/testing/master/dcos_generate_config.sh'
  }

  options {
    timeout(time: 3, unit: 'HOURS')
  }

  stages {
    stage('Authorization') {
      steps {
        user_is_authorized(master_branches, '8b793652-f26a-422f-a9ba-0d1e47eb9d89', '#frontend-dev')
      }
    }

    stage('Initialization') {
      steps {
        ansiColor('xterm') {
          retry(2) {
            sh '''npm --unsafe-perm install'''
          }

          sh '''npm run scaffold'''
        }
      }
    }

    stage('Lint') {
      steps {
        ansiColor('xterm') {
          sh '''npm run lint'''
        }
      }
    }

    stage('Unit Test') {
      steps {
        ansiColor('xterm') {
          sh '''npm run test -- --maxWorkers=2'''
        }
      }
    }

    stage('Build') {
      steps {
        ansiColor('xterm') {
          sh '''npm run build-assets'''
        }
      }

      post {
        always {
          stash includes: 'dist/*', name: 'dist'
        }
      }

    }

    // stage('Integration Test') {
    //   steps {
    //     unstash 'dist'

    //     sh "./scripts/ci/run-integration-tests"
    //   }

    //   post {
    //     always {
    //       archiveArtifacts 'cypress/**/*'
    //       junit 'cypress/results.xml'
    //     }
    //   }
    // }

    // stage('System Test') {
    //   steps {
    //     withCredentials([
    //       [
    //         $class: 'AmazonWebServicesCredentialsBinding',
    //         credentialsId: 'f40eebe0-f9aa-4336-b460-b2c4d7876fde',
    //         accessKeyVariable: 'AWS_ACCESS_KEY_ID',
    //         secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
    //       ]
    //     ]) {
    //       unstash 'dist'

    //       ansiColor('xterm') {
    //         retry(2) {
    //           sh '''dcos-system-test-driver -j1 -v ./system-tests/driver-config/jenkins.sh'''
    //         }
    //       }
    //     }
    //   }

    //   post {
    //     always {
    //       archiveArtifacts 'results/**/*'
    //       junit 'results/results.xml'
    //     }
    //   }
    // }

    stage('Release New Version') {
      when {
        branch "jgieseke/add-release-to-jenkinsfile-nopr"
        expression { params.CREATE_VERSION == true }
      }

      steps {
        unstash 'dist'

        withCredentials([
            string(credentialsId: '3f0dbb48-de33-431f-b91c-2366d2f0e1cf',variable: 'AWS_ACCESS_KEY_ID'),
            string(credentialsId: 'f585ec9a-3c38-4f67-8bdb-79e5d4761937',variable: 'AWS_SECRET_ACCESS_KEY'),
            usernamePassword(credentialsId: 'a7ac7f84-64ea-4483-8e66-bb204484e58f', passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USER')
        ]) {
          sh "./ci/create-release"
        }
      }
    }

    stage('Release Latest') {
      when {
        branch "jgieseke/add-release-to-jenkinsfile-nopr"
      }

      steps {
        unstash 'dist'

        withCredentials([
            string(credentialsId: '3f0dbb48-de33-431f-b91c-2366d2f0e1cf',variable: 'AWS_ACCESS_KEY_ID'),
            string(credentialsId: 'f585ec9a-3c38-4f67-8bdb-79e5d4761937',variable: 'AWS_SECRET_ACCESS_KEY')
        ]) {
          sh "./ci/update-latest"
        }
      }
    }
  }
}
