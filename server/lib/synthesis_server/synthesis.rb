
#FIXME: we should change to our internal representation once we have it and get
#rid of RTLIL
$LOAD_PATH << '.'
$LOAD_PATH << '../../../../graph'

require 'frontend/rtlil'
require 'core/graph'

#mock synthesis that changes the names of the gates in the netlist
#used for test purposes
class DummySynthesisTool
  attr_reader :synthesized_netlist

  def initialize netlist, technology
    @netlist = netlist
    @technology = technology
  end

  def synthesize
    synthesized_nodes = {}

    @netlist.nodes.each do |id,node_|
      node = node_.generator
      #FIXME: we should change to our internal representation once we have it and get
      #rid of RTLIL
      synthesized_node = Cell.new("#{node.name}_synthesized", node.src, node.line, node.module, "#{node.type}_#{@technology}", node.function)
      synthesized_nodes[id] = synthesized_node
    end

    @netlist.clone synthesized_nodes 
  end
end
