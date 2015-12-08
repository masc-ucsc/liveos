SETTING UP
=============
In order to run LiveSim, you first need to set up LiveOS which is explained in 
README.md. Then do the following steps:

1. Singup in LiveOS and create a new project (you can name it LiveSim).

2. Once created the project, go to liveos/files/[project_id] and checkout
ESESC there. Make sure esesc source code is in liveos/files/[project_id]/esesc.

3. Create a directory named build in the project folder and run the following:
* cmake -DENABLE_LIVE=1 ../esesc
* make
* make live

4. Switch to the build directory and run the following:
* mkdir run
* cd run
* cp ../../esesc/conf/* .
* cp ../../esesc/bins/* .
* cp -r [spec2006_benchmarks_home]/bins .
* cp -r [spec2006_benchmarks_home]/data .
* cp [live_repo]/misc/livesim_run/* .

5. Modify esesc.conf file in the run directory, set enable_live to 1 and choose
live as sampling method.

6. Modify live_benchs.json and set "server" to the current machine name or IP. Here
you can also choose the benchmarks, length of execution, and number of checkpoints. In case
you are using different benchmarks, you will need to change the benchmark records to refelect
correct names and file locations.

7. For all worker machines, clone ESESC (preferably in a non-NFS location) and repeat
steps 3 to 5. Then, modify controller.json setting host to the worker machine name/IP
setting server to the LiveOS machine and number of cores to CPU cores available. In case
the worker machine is the same machine as the web-server and you are running the worker
node in the same run directory that you have done step 6 in, is_local should be 1 otherwise
0. Make sure nodejs and npm are installed. Then run the following in the run directory:
* sudo npm install -g forever
* npm install

RUNNING LIVESIM
===============
1. First, you need to run LiveOS server daemon(s). You can run all daemons together by running
the following command in LiveOS home directory:
* ./boot.sh
* forever -o logs/livesim.out -e logs/livesim.err start livesim_daemon.js

You can also run server.js daemon and livesim_daemon.js separately for debugging reasons. You
can shut down all daemons by:
* ./unboot.sh

2. On each machine, go to the run directory of esesc and run the following:
* forever -o log.out -e log.err start controller.js

Controller is always alive and even if the web server shuts down, it tries reconnecting. In
case you needed to shut down the controller, you can run the following in the same directory:
* forever stop controller.js

3. Unless the worker machines are restarted or you have stopped the controller, there is no
need to repeat step 2 every time you repeat step 1.

4. Log into your LiveSim project and launch the LiveSim app. Setup takes a few minutes
depending on the benchmarks. You can see the LiveSim logs in liveos/logs/livesim.out and
liveos/logs/esesc.err. For debugging, you can use node-inspector.
