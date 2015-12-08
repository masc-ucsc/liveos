#!/bin/bash
CURDIR=$(pwd)

cd misc/terminal_binary/
make
sudo rm -rf /opt/liveos_terminal/
sudo mkdir /opt/liveos_terminal/
sudo mv terminal_binary /opt/liveos_terminal/.

cd ../../conf
sudo cp passkey /opt/liveos_terminal/.
sudo cp key /opt/liveos_terminal/.
sudo cp iv /opt/liveos_terminal/.

cd /opt/liveos_terminal
sudo ln -s terminal_binary _edit
sudo ln -s terminal_binary _kill
sudo ln -s terminal_binary _livesim
sudo ln -s terminal_binary _git

echo $(hostname) > /tmp/terminal_binary.conf
sudo mv /tmp/terminal_binary.conf /opt/liveos_terminal/terminal_binary.conf

echo "export PATH=$PATH:/opt/liveos_terminal/" >> $HOME/.profile
echo "export PATH=$PATH:/opt/liveos_terminal/" >> $HOME/.bashrc
