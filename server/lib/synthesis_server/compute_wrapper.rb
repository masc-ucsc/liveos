
$LOAD_PATH << '.'
$LOAD_PATH << '../../../../graph'

require 'socket'
require 'netlist_diff'
require 'synthesis'
require 'frontend/rtlil_parser'
require 'core/graph'

class Server
  attr_reader :graph1, :graph2

  def initialize(ip, jsserver_port)
    @jsserver = TCPServer.open(ip, jsserver_port)
    @clients = []
    Thread.start { run }
  end

  def run
    loop {
      Thread.start(@jsserver.accept) do |client|
        @clients << client
        server_listener(client)
      end
    }.join
  end

  def server_listener(client)
    puts "listening to #{client}"
    parser = RTLILParser.new

    loop {
      msg = client.gets.chomp
      puts "#parsing: #{msg}"
      parser << msg 

      #maybe do a callback?
      if parser.done
        byebug
        if @graph1 == nil
          @graph1 = parser.module.to_graph
          puts "graph1 available"

          synth = DummySynthesisTool.new @graph1, "22nm"
          @synthesized_graph = synth.synthesize
          byebug
        else
          @graph2 = parser.module.to_graph
          puts "graph2 available"

          diff = NetlistDiff.new(@graph1, @graph2)
          diff.diff
          byebug
        end
      end
    }
  end

  def create_mock_graph
    @graph1 = Graph.new "mock netlist1", ["out1", "out2", "out2"], (1..5).map { |i| "in#{i}"}

    @graph1.add_node :and, ["out3"], ["tmp1", "tmp2"]
    @graph1.add_node :and, ["out2"], ["tmp3", "tmp4"]
    @graph1.add_node :and, ["out1"], ["tmp5", "tmp6"]

    @graph1.add_node :and, ["tmp1"], ["in1", "in2"]
    @graph1.add_node :and, ["tmp2"], ["in3", "in4"]
    @graph1.add_node :and, ["tmp3"], ["in1", "in3"]
    @graph1.add_node :and, ["tmp4"], ["in4", "in5"]
    @graph1.add_node :and, ["tmp5"], ["in2", "in4"]
    @graph1.add_node :and, ["tmp6"], ["in3", "in5"]
  end

end

