#!/bin/bash
git clone https://github.com/junegunn/fzf.git ~/.fzf
~/.fzf/install

mkdir ~/.go/
export GOPATH=~/.go/
go get github.com/google/codesearch/cmd/{csearch,cindex}
echo "export PATH=$PATH:~/.go/bin" >> $HOME/.profile
echo "export PATH=$PATH:~/.go/bin" >> $HOME/.bashrc
