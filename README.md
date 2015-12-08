Installation
=============
First step is to clone the repository recursively so you get the submodules as well:
* git clone https://github.com/masc-ucsc/liveos

Make sure the following packages are installed and updated on your system:
* git
* nodejs
* npm
* mongodb
* crypto++
* texlive (all)
* rubber
* go
* the silver searcher (may need manual installation on some platforms)

Once packages are installed, make sure you enable and start mongodb service. You may need to create /data/db directory on your system first. Then run the following to install forever module:
* sudo npm install forever -g

In case your Python version is newer than 3.0, switch it back using the following command:
* export PYTHON=python2.7

Install all the dependencies by running the following in LiveOS home directory:
* npm install

In order to install code search plug-in, make sure *go* is installed on your machine and run the following:
* install/csearch.sh

You also need to run the terminal script to compile the special control executable for terminal app:
* install/terminal.sh

The next step is to create and if needed modify the configuration files. To do so, run the following in LiveOS home directory:
* install/configure.sh

This script, generate a directory named etc inside LiveOS home directory and copies the configuration files there. You can modify this conf files for your clone of LiveOS without affecting the repository. The "server.json" conf file specifies the ports used to run the daemons. You can limit registration in your LiveOS by setting a passkey (not asked if left empty) and also chose your terminal type between "user" and "docker". Please be careful as "user" terminal gives full access to your user shell to whoever opens the terminal app in LiveOS. Docker terminal requires a few more steps to be taken which are explained in the next section.

Depending on the ports used for daemons, you may need to allow access to them in your firewall. In case of default configuration and ufw, you can set the following rule:
* sudo ufw allow 8079:8090/tcp

Once setup is done, exit shell and log back in.


Setting Up Docker
-----------------
Docker is optionally used in LiveOS to provide fast and easy to use containers for compiling, testing and other purposes. If docker is set up, LiveOS users can have access to their own private containers using the terminal app as well as project-based shared containers. To set up docker for LiveOS, first make sure docker is installed on the machine and docker service is up and running (may require reboot after installation). To check this, you can run:
*docker ps

Then do the following steps
* run: sudo groupadd docker
* run: sudo gpasswd -a ${USER} docker
* restart docker service
* log out and log back in
* run: install/docker.sh

The last step is to change terminal format from "user" to "docker" in conf/server.json file.


Running LiveOS
===============
In order to run LiveOS, all you need to do is to run the following in LiveOS home directory:
* ./boot.sh

You should be able to see LiveOS up and running by typing the following in your browser window:
* http://*server-name-or-ip*:8080

Or any other port in case you have changed the port configuration. To stop LiveOS:
* ./unboot.sh

You can also run each daemon individually by node or forever. Examples are:
* node example_daemon.js
* forever -o logs/example.out -e logs/example.err start example_daemon.js

Please note that the first daemon to run is server.js and the you can run the other ones. Logs and errors are stored in the logs folder per daemon process.


Running LiveOS as a Docker Container
====================================
For convenience in setting up LiveOS, we have also created the docker image for it which can be pulled and run on any machine that has docker installed and set up. You can pul the LiveOS docker image by running the following:
* docker pull mascucsc/liveos

To create and run a container, run the following:
* docker run -it --privileged -p 8080:8080 -p 8081:8081 -p 8082:8082 -p 8083:8083 -p 8084:8084 -p 8085:8085 -p 8086:8086 mascucsc/liveos

It may take a while to download and set up the container. Once LiveOS container is running, you are in a bash process inside the container. If you exit, the container stops. To exit the shell and keep the container running do Ctrl + P + Q. We have included the docker files and scripts  in misc/docker.


Debugging
==========
In order to debug, we recommend to use node-inspector:
* sudo npm install -g node-inspector

To start debugging, start node-inspector:
* node-inspector --config etc/debug.json

Then you can run any daemon in debug mode by doing:
* node --debug example_daemon.js

node-inspector prints the debug URL in its standard output, copy that location and open it in your web browser to be able to access the web-based debugger.


Secret Mode
===========
Since LiveOS is a good environment to code, we have enabled the ability of developing it by itself. There is a secret mode that enables the code editor to edit any file (not just files in the current project) and a terminal that is not limited to a docker container. However, only admin users have access to the secret mode. To make a user admin, run the following in LiveOS home directory:
* node misc/mkadmin.js *user_email*

Once your user is added to admin group, you can open the secret mode prompt by pressing and releasing "ctrl shif s" combination in LiveOS (should be logged in to a project). In the prompt, you can type "edit" for the admin code editor and "term" for admin terminal and hit enter.

In the admin terminal you can use the following commands:
* _edit
* _git 
* _kill


Create Your Own App
===================
You can easily create your own app for LiveOS without any changes made to the code repository. We have included a Hello World app which you can clone and start working on it. It has the required comments and examples to get you started. You can find the source code for the hello world app here:

Server side: hello_daemon.js and server/lib/hello_server.js
Client side: public/apps/hello_world/*

By default, this app is not included in the menu and no shortcut is assigned. To do assign menu and shortcut, modify *public/apps/hello_world/descriptor.json* setting *menu* to "apps" and *shortcut* to "alt h". Doing so, you will see the app in LiveOS apps menu after a restart to the server.