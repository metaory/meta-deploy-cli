#### META-DEPLOY-CLI

##### Language Agnostic AWS ECS Deployment CLI

* * *

#### :cyclone: Prerequisites

-   [`Node-LTS`](https://nodejs.org/en/download/)
-   [`Yarn`](https://yarnpkg.com/lang/en/docs/install/)
-   [`Docker`](https://docs.docker.com/install/)
-   [`AWS`](https://docs.aws.amazon.com/cli/latest/userguide/installing.html)

* * *

#### :wrench: Setup

##### :dizzy: Integrate into a repository

from the `<target>` repository directory

    git submodule add git@github.com:metaory/meta-deploy-cli.git deploy
    bash build/install.sh

    git add deploy .gitmodules config.json package.json
    git commit -am 'added deploy-cli submodule'
    git push origin

##### :arrow_double_down: update to latest `deploy-cli` from integrated repository

    git submodule update --remote

**with force**

    git submodule update --remote --init --recursive --force

##### :electric_plug: Fresh git clone from integrated repository

    git clone git@github.com:<organization_name>/<repository_name>.git --recursive

##### :zap: Install and run `CLI` from integrated repository

    bash deploy/install.sh

* * *

#### :nut_and_bolt: Configure

Apart from all the local and app configs CLI will collects and store in `config.json` you should configure any number of commands as part of your build, such as`pre-app-build`, `app-build`, `post-app-build`, ...

`APP_BUILD_SEQUENCE` can have as many `Objects`, each `key` is lablel for the sequence group and can be any `String`

each group can have as many `Objects`

each command `String` in `Array` of `COMMANDS`

default `cwd` for command  is `.` root of `<target_repository>`
or provided relative path from root, like `src/main`

**available config variables**:

-   `{ENV}`
-   `{APP_VERSION}`

```json
      "APP_BUILD_SEQUENCE": {
        "foo": [{
            "NAME": "My OPT olo ONE",
            "COMMANDS": ["ls", "echo {APP_VERSION}"]
          },
          {
            "NAME": "My OPT olo 2",
            "PATH": "deploy",
            "COMMANDS": ["ls", "echo {ENV}"]
          }
        ],
        "my post sequence": [{
          "NAME": "Zzz",
          "COMMANDS": ["sleep 3"]
        }],
        "bar": [{
          "NAME": "baz",
          "PATH": "src/main",
          "COMMANDS": ["ls"]
        }]
      }
```

> _windows users might have other requirement or configuration required_
