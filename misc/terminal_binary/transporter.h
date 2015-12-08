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

#define MAX_BUFFER_SIZE 1024
#define KEY_CHANGE_INTERVAL 10
#define MAX_DATA 70000
#define MAX_REPORT_BUFFER 40960

#include <stdint.h>
#include <string.h>
#include <stdlib.h>
#include <stdarg.h>
#include <stdio.h>
#include <dlfcn.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include <string>
#include <sstream>
#include <iomanip>
#include <iostream>
#include <fstream>
#include "crypto++/modes.h"
#include "crypto++/aes.h"
#include "crypto++/filters.h"


using namespace std;

class Transporter {
  private:
    static char * host;
    static int portno;
    static int sockfd;
    static string buffer[MAX_BUFFER_SIZE];
    static byte orig_key[CryptoPP::AES::DEFAULT_KEYLENGTH];
    static byte key[CryptoPP::AES::DEFAULT_KEYLENGTH];
    static byte old_key[CryptoPP::AES::DEFAULT_KEYLENGTH];
    static byte iv[CryptoPP::AES::BLOCKSIZE];
    static int key_valid;
    static byte toggle;

    static void buffer_push(string data);
    static string buffer_pull(char type, string message);
    static void send(unsigned char * buf, int length);
    static string receive(char type, string message);
    static void renew_key();

  public:
    static void connect_to_server(char * h, int pn);
    static void disconnect();
    static void send_json(string message, string data);
    static void send_schema(string name, string schema);
    static void send_data(char * name, unsigned char * data, int len, char * sid);
    static void send_string(string message, string data);
    static string receive_data(string message);
    static void send_fast(const string message, const char * format, ...);
    static void receive_fast(const string message, const char * format, ...);
};