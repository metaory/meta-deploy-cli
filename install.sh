#!/usr/bin/env bash

bold=$(tput bold)
normal="\033[0m"
nc="\033[0m"
red="\033[1;31m"
#clear

unameOut="$(uname -s)"

args=$1
###############################################################################
setup () {
  if [ ! -d deploy ]; then
    echo -e "${bold}${red}this script can not run without a host!${nc}"
    echo -e "${bold} it have to be placed as submodule in another project ./deploy${nc}"
    echo -e "${bold} read https://github.com/metaory/meta-deploy-cli${nc}\n"
    exit 1
  fi

  cd deploy

  if [ ! -f ../config.json ] || [ "$args" = "force" ]; then
    echo -e "copying ${bold}./deploy/config.template.json > ./config.json ${nc}\n"
    cp config.template.json ../config.json
  else
    echo -e "skipped ${bold}cp config.template.json ../config.json${nc} , to overwrite:\n${bold}bash deploy/install.sh force${nc}\n"
  fi

  yarn
  cd ..

  if [ ! -f ./package.json ]; then
    echo -e "${bold}${red}package.json not found${nc}\n"
    npm init
  fi

  echo -e "\n you can now run:${nc}"
  echo -e " ${bold}   node deploy${nc} or"
  echo -e " ${bold}   yarn deploy${nc}"
  echo -e "\n press ${bold}<any>${nc} key to continue"
  read dummy
  node deploy $args
}
###############################################################################
arch_linux_setup () {
  if ! hash "node"  2> /dev/null; then
    sudo pacman -Sy nodejs
  fi
  if ! hash "yarn"  2> /dev/null; then
    yaourt yarn
  fi
  setup
}
###############################################################################
ubuntu_setup () {
  if ! hash "node"  2> /dev/null; then
    curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
  if ! hash "yarn"  2> /dev/null; then
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
    sudo apt-get update && sudo apt-get install yarn
  fi
  setup
}
###############################################################################
mac_setup () {
  if ! hash "brew"  2> /dev/null; then
    /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
  fi
  if ! hash "node"  2> /dev/null; then
    brew install node
  fi
  if ! hash "yarn"  2> /dev/null; then
    brew install yarn
  fi
  setup
}
###############################################################################
case "${unameOut}" in
  Linux*)
    dist=$(tr -s ' \011' '\012' < /etc/issue | head -n 1)
    case "${dist}" in
      Arch*)    arch_linux_setup;;
      Ubuntu*)  ubuntu_setup;;
    esac
    ;;
  Darwin*)      mac_setup;;
  *) echo -e " ${bold}https://nodejs.org/en/download/ \nhttps://yarnpkg.com/lang/en/docs/install/${nc}";;
esac
