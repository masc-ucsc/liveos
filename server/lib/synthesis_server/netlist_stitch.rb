

#gets a pre-synthesis netlist, a pre-synthesis netlist after a delta, a
#post-synthesis netlist before the delta, and stitches the delta changes to the
#post-synthesis netlist, removing any portion of the post-synthesis netlist that
#is no longer used

#this is taken from http://dl.acm.org/citation.cfm?id=1950442
class NetlistStitch

  def initialize pre_old, pre_new, post_old, identical
    @pre_old = pre_old
    @pre_new = pre_new
    @post_old = post_old
    @identical = identical
  end

  #simply merge both netlists in one data-structure
  def glue 
    @working_netlist = {}

    @post_old.nodes.each do |id,node|
      @working_netlist["post###{id}"] = node.clone
    end

    @pre_new.nodes.each do |id,node|
      @working_netlist["pre_new###{id}"] = node.clone
    end
  end

  def connect_in_fibs
    @identical.each do |id,node|
      @working_netlist["pre_new###{id}"].out_edges = @working_netlist["post###{id}"].out_edges.clone

      @working_netlist["pre_new###{id}"].out_edges.each do |edge|
        edge.src = @working_netlist["pre_new###{id}"]
        edge.nodes.remove @working_netlist["post###{id}"]
        edge.nodes << @working_netlist["pre_new###{id}"]
      end
    end
  end

  def connect_out_fibs
    @identical.each do |id,node|
      @working_netlist["pre_new###{id}"].in_edges = @working_netlist["post###{id}"].in_edges.clone

      @working_netlist["pre_new###{id}"].in_edges.each do |edge|
        edge.snk = @working_netlist["pre_new###{id}"]
        edge.nodes.remove @working_netlist["post###{id}"]
        edge.nodes << @working_netlist["pre_new###{id}"]
      end
    end
  end

  def stich
  end

end
