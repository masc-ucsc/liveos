#base arch install with alpm fix installed
FROM l3iggs/archlinux 

# Install Node.js and npm etc..
RUN		  pacman -Scc --noconfirm
RUN     pacman -Syy --noconfirm
RUN     pacman -Syu --noconfirm
RUN     pacman -S --noconfirm nodejs
RUN     pacman -S --noconfirm docker
RUN     pacman -S --noconfirm python2
RUN     pacman -S --noconfirm make
RUN     pacman -S --noconfirm gcc
RUN     pacman -S --noconfirm vim
RUN     pacman -S --noconfirm sudo
RUN     pacman -S --noconfirm openssh
RUN		  pacman -S --noconfirm crypto++
RUN     pacman -S --noconfirm tmux

RUN     echo '%docker ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
ENV     PYTHON python2.7
ENV		  PATH $PATH:/.liveos_terminal
ENV     TERM xterm

#launch this arch image with a bash shell. Remember: interactive (cmd line persistence) mode is handled by the command that launches this docker
CMD echo PS1=\'\\u \\W$ \' >> /etc/bash.bashrc && /bin/bash 
