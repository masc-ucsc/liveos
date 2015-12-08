/*
 * (C) Copyright 2015 Regents of the University of California and LiveOS Project.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *     Sina Hassani
 */
 
#include <string>
#include <iostream>
#include <fstream>
#include <dirent.h>

#include "transporter.h"
using namespace std;

void print_livesim_usage () {
  printf("Usage:\n");
  printf("_livesim start [{metric}]\n");
  printf("_livesim stop\n");
  printf("_livesim wait\n");
  printf("_livesim save {name}\n");
  printf("_livesim {command} {params}\n");
}

int main(int argc, char* argv[]) {
  string hostname;
  //open conf file
  ifstream infile;
  infile.open("/opt/liveos_terminal/terminal_binary.conf");
  
  if (infile.is_open()) {
    //print file:
    //cout << "opened properly\n";

  } else {
    //show message:
    cout << "Error opening conf file\n";
    exit;
  }

  getline (infile, hostname);

  char *hostname_char = const_cast<char*>(hostname.c_str());

  if((argv[0]) == string("_edit")){
    Transporter::connect_to_server(hostname_char, 8079);
    if(argc < 2){
      cout << "Usage: _edit <filename> <line num>\n";
      exit;

    } else {

      char path[256];
      char* socket_env_var;
      char* term_type;
      char* user_id;
      char* file_passed;
      char* holder;
      char answer[256];
      char* line_num;
      char* shared_proj_id;


      line_num = argv[2];
      term_type = getenv("TERMTYPE");
      shared_proj_id = getenv("PROJID");
      socket_env_var = getenv("SOCKETINFO");
      user_id = getenv("USERID");
      file_passed = argv[1];

      getcwd(path, 255);
      string path_string = string(path);

      size_t local_path = path_string.find("/home");

      if(local_path != string::npos){ //We are trying to _edit a local docker file, begin transactions to copy file...
        Transporter::send_fast("local_file_request", "%s,%s,%s", file_passed, socket_env_var, term_type);
        Transporter::receive_fast("local_file_resp", "%s", &answer);
        //string answer_string(answer);

        if(answer == string("yes")){

          strcat(path, "/"); //this takes the local docker file from WHEREVER it is within the local hierarchy and copies it to the top level proj folder /proj_id_folder/file
          strcat(path, argv[1]);
          char dest_path[256] = "/proj_mnt/";
          strcat(dest_path, argv[1]);

          ifstream  src(path, ios::binary);
          ofstream  dst(dest_path, ios::trunc);
          dst << src.rdbuf();

          cout << "File Transferred\n";
          //cout << "THIS: " << path << " TO THIS: " << dest_path << endl;


          Transporter::send_fast("_edit", "%s,%s,%s,%s,%s,%s,%s", path, file_passed, socket_env_var, term_type, line_num, user_id, shared_proj_id);

        } else {

          cout << "Operation canceled\n";
        }

      } else { //editing a file that exists within a docker mount point...

        strcat(path, "/");
        strcat(path, argv[1]);

        Transporter::send_fast("_edit", "%s,%s,%s,%s,%s,%s,%s", path, file_passed, socket_env_var, term_type, line_num, user_id, shared_proj_id);
      }

    }
  } else if((argv[0]) == string("_git")){
    Transporter::connect_to_server(hostname_char, 8079);
    if (argc < 2){
      cout << "Usage: _git <params>\n";
      cout << "Available cmds: " << endl;
      cout << "    _git commit <message>" << endl;
      cout << "    _git branch" << endl;
      cout << "    _git branch <branch name>" << endl;
      cout << "    _git branch -d <branch name>" << endl;
      cout << "    _git checkout -b <new name>" << endl;
      cout << "    _git checkout <branch name>" << endl;
      cout << "    _git rebase @{u}" << endl;
      cout << "    _git rebase <branch name>" << endl;


    }else {

      char path[256];
      char params[256] = {}; 
      char* socket_env_var;
      char* term_type;
      char* shared_proj_id;
      char* priv_proj_id;
      char* user_id;
      DIR *dir;
      struct dirent *ent;
      bool is_git_dir;

      for(int i = 1; i < argc; i++){
        strcat(params, argv[i]);
        strcat(params, " ");
      }
      
      getcwd(path, 255);
      is_git_dir = false;
      //need to test this
      if((dir = opendir (path)) != NULL){
        while((ent = readdir (dir)) != NULL){
          //cout << ent->d_name << endl;
          if(ent->d_name == string(".git")){
            //cout << "THIS DIR IS GOOD" << endl;
            is_git_dir = true;
          } //else {
            //cout << "This is not a GIT directory" << endl;
          //}
        }
        closedir(dir);
      } else {
        cout << "Could not open current dir to parse files";
      }

      if(is_git_dir == true){

        char char_array[256] = {0}; 
        term_type = getenv("TERMTYPE");
        socket_env_var = getenv("SOCKETINFO");
        shared_proj_id = getenv("PROJID");
        priv_proj_id = getenv("PRIVPROJID");
        user_id = getenv("USERID");

        if ((argc == 2) && (argv[1] == string("branch"))){ //we do the handshake for branch information here
          Transporter::send_fast("_git", "%s,%s,%s,%s,%s,%s,%s", params, socket_env_var, term_type, shared_proj_id, user_id, path, priv_proj_id);
          Transporter::receive_fast("avail_branches", "%s", char_array);

          string char_array_str = string(char_array);
      
          replace(char_array_str.begin(), char_array_str.end(), ',', '\n');
          printf("\033[1;31mAvailable branches: \n\033[0m%s", char_array_str.c_str());
          cout << endl;
        


        } else { // this is a different git operation

          Transporter::send_fast("_git", "%s,%s,%s,%s,%s,%s,%s", params, socket_env_var, term_type, shared_proj_id, user_id, path, priv_proj_id);
          Transporter::receive_fast("_git_cmd_resp", "%s", char_array);

          string char_array_str = string(char_array);
        
          if(char_array_str == string("true")){

            cout << "Operation successful" << endl;

          } else if (char_array_str == string("false")){

            cout << "Operation failed!!" << endl;

          }
        }

      } else {

        cout << "Error: this is not a git repository directory" << endl;

      }
    }

  } else if((argv[0]) == string("_kill")){
    Transporter::connect_to_server(hostname_char, 8079);
    char char_array[256] = {0};
    char* char_pointer;
    char* holder;
    char* term_type;
    char* term_name;
    char host_name[128];
    
    term_type = getenv("TERMTYPE");
    term_name = getenv("TERMNAME");
    gethostname(host_name, sizeof host_name);
  
    if (argc < 2){ //query the available dockers to kill
      string find_me (","); //This is to get around the problem of using vsscanf in transporter.cpp (so that I can send strings with spaces)

      Transporter::send_fast("list_kills", "%s,%s,%s", term_type, host_name, term_name);
      Transporter::receive_fast("avail_kills", "%s", char_array);

      string char_array_str = string(char_array);
      
      replace(char_array_str.begin(), char_array_str.end(), ',', '\n');
      //cout <<  << char_array_str << endl;
      printf("\033[1;31mAvailable to kill: \n\033[0m%s", char_array_str.c_str());
      cout << endl;

    } else { //we have something to try and kill from the cmdline, try to kill it 

      char params[256] = {0};
      char answer[10] = {0};
      char* socket_env_var;
      char* term_type;

      for(int i = 1; i < argc; i++){
        strcat(params, argv[i]);
        strcat(params, " ");
      }
      
      term_type = getenv("TERMTYPE");
      socket_env_var = getenv("SOCKETINFO");

      Transporter::send_fast("_kill", "%s,%s,%s", params, socket_env_var, term_type);
      Transporter::receive_fast("kill_status", "%s", &answer);
      //check if kill succeeded here with an if
      if(answer == string("no")){
        printf("\033[1;31mOne or more Dockers were not found\n\033[0m");
        cout << endl;
      } else {
        printf("\033[1;31mKilled Docker(s): \n\033[0m%s", string(answer).c_str());
        cout << endl;
      }

    }

  } else if((argv[0]) == string("_livesim")) {
    Transporter::connect_to_server(hostname_char, 8078);
    const char * proj_id;
    const char * nd = "nondocker";
    if(getenv("TERMTYPE") == NULL || getenv("TERMTYPE") == nd) {
      proj_id = "admin";
    } else {
      proj_id = getenv("PROJID");
    }


    if(argc < 2 || argv[1] == string("save") && argc < 3) {
      print_livesim_usage();
      return 0;
    }
    char * cmd = argv[1];
    char * name;
    const char * metric;

    if(cmd == string("start")) {
      if(argc > 2)
        metric = argv[2];
      else 
        metric = "ipc";
      Transporter::send_fast("livesim_start", "%s,%s", proj_id, metric);
    } else if(cmd == string("stop")) {
        Transporter::send_fast("livesim_stop", "%s", proj_id);
    } else if(cmd == string("save")) { 
      name = argv[2];
      Transporter::send_fast("livesim_save", "%s,%s", proj_id, name);
    } else if(cmd == string("wait")) {
      Transporter::send_fast("livesim_wait", "%s", proj_id);
      Transporter::receive_fast("livesim_done", "");
      printf("Simulation done\n");
      return 0;
    } else if (cmd == string("touch")) {
      name = argv[2];
      Transporter::send_fast("livesim_touch", "%s,%s", proj_id, name);
    } else {
      char * params = argv[2];
      Transporter::send_fast("livesim_cmd", "%s,%s,%s", proj_id, cmd, params);
    }

  } else {
    Transporter::send_fast("not_a_command", "%d,%d", 33, 19);
  }
  
  //int foo, bar;
  //Transporter::receive_fast("cp_reg", "%d,%d", &foo, &bar);
  //printf("%d\n", foo);
  //printf("%d\n", bar);

  return 0;
}
