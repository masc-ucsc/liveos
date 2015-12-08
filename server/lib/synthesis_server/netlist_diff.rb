
#structurally compare two netlists 
#find nodes that are identical in both of them
#
#functional/formal comparison is expensive and unnecessary if diff is applied
#right after extracting the netlist, since this is a well behaved method


#this is taken from http://dl.acm.org/citation.cfm?id=1950442
class NetlistDiff

  def initialize graph1, graph2
    @graph1 = graph1
    @graph2 = graph2

    @is_identical = {}
    @delta = {}
    @fibs = {}
  end

  def diff
    find_fibs

    @fibs.each do |id,fibs|
      byebug if fibs[1] == nil
      if diff_fib fibs[0], fibs[1]
        @is_identical[id] = fibs[1]
      else
        @delta[id] = fibs
      end
    end
  end

  def find_fibs
    @graph1.nodes.each do |id,node| 
      byebug if @fibs[id] != nil

      #FIXME: not sure if we want to keep this here
      if @graph2.nodes[id] == nil
        @delta[id] = [node] 
        next
      end

      @fibs[id] = [node, @graph2.nodes[id]]
    end
  end

  def diff_fib old_fib, new_fib
    #FIXME: change this to allow retiming (see paper)
    identical = old_fib.generator.type == new_fib.generator.type

    #FIXME: we do not allow multi-driven nets!!!
    #FIXME: this is bad coding, in_edges is a set, and thus we should not use
    #ordering here.
    #ideally we should be checking on a per-terminal basis
    new_fanin = new_fib.in_edges.map { |net| net.src }
    old_fanin = old_fib.in_edges.map { |net| net.src }

    new_fanin.each_with_index do |fanin,idx|
      if(@fibs[fanin.id] == nil)
        identical = identical and diff_fib(old_fanin[idx], fanin)
        return false unless identical
      end
    end

    identical
  end

end


