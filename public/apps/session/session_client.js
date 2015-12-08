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
 *     Dimitri Gerasimov
 */

function session_client () {
	var self = this;
	var session;
	this.socket = io.connect(':' + PORTS.main + '/file_server', {'force new connection': true, query: $.param({token: TOKEN})});	
	this.saved_session = null;
	


	this.send_object = function(objectname){
		console.log(USER_ID + ' ' + objectname);
		self.socket.emit('send_session', {user_id: USER_ID, session_obj: objectname});
		
	};

	this.get_object = function(){
		self.socket.emit('get_session', {user_id: USER_ID});
	};

	this.socket.on('receive_session', function (obj) {
		//if(obj.project_id != PROJECT_ID && obj.user_id != USER_ID)
			//return;
		
		var saved_user;

		self.saved_session = obj.session;
		saved_user = obj.user_id;

		//console.log(self.saved_session + ' THISIS FROM SERVER ' + saved_user);
	});
}