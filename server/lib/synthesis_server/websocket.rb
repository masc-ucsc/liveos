require 'em-websocket'

require_relative 'compute_wrapper'

EM.run {
  
  #listen to yosys updates
  @server = Server.new("localhost", 3001)
  #@server.create_mock_graph

  EM::WebSocket.run(:host => "0.0.0.0", :port => 4567) do |ws|
      byebug
    ws.onopen { |handshake|
      puts "WebSocket connection open"
      #ws.send "Hello Client, you connected to #{handshake.path}"
    }

    ws.onclose { 
      puts "Connection closed" 
    }

    ws.onmessage { |msg|
      command = msg.split("##")
      puts "Got: #{command[0]}"
      case (command[0])
      when "request_graph"
        puts "Sending graph info (graph size = #{@server.graph1.nodes.size}"
        ws.send "graph###{@server.graph1.serialize}"
      when "center"
        puts "Center at #{command[1]} with radius #{command[2]}"
      end
    }
  end
}
