define(['kinetic', 'jquery', 'underscore', 'jquery-visibility', 'jQuery.resizeEnd'], 
       function(Kinetic, $, _) {

  function mkarray(w, h) {
    var a = new Array(w);
    for(var i = 0; i < w; i++) {
      a[i] = new Array(h);
      for(var j = 0; j < h; j++) {
        a[i][j] = 0;
      }
    }
    return a;
  }

  function randint(max) { return Math.floor(Math.random() * max); };
  var point = function(x, y) { 
    return { 
      x: x, y: y,
      
      above: function() { return point(x, y - 1); },
      below: function() { return point(x, y + 1); },
      left: function() { return point(x - 1, y); },
      right: function() { return point(x + 1, y); },

      copy: function() { return point(this.x, this.y); },

      add: function(vec) { 
        if(arguments.length == 2) vec = vector(vec, arguments[1]);
        return point(this.x + vec.x, this.y + vec.y); 
      },

      scale: function(vec) { 
        if(arguments.length == 2) vec = vector(vec, arguments[1]);
        return point(this.x * vec.x, this.y * vec.y); 
      },

      apply: function(f) { return point(f(this.x), f(this.y)); },
      floor: function() { return this.apply(Math.floor); },
      round: function() { return this.apply(Math.round); }
    }; 
  };

  var vector = function(x, y) {
    return { 
      x: x, y: y,

      scale: function(s) { return vector(this.x * s, this.y * s); },
      turn_clockwise: function() { return vector(-this.y, this.x); },
      equals: function(v) { return this.x === v.x && this.y === v.y; },
      negate: function() { return vector(-this.x, -this.y); }
    };
  };

  vector.up = vector(0, -1);
  vector.right = vector(1, 0);
  vector.down = vector(0, 1);
  vector.left = vector(-1, 0);
  vector.random_direction = function(legal) {
    return _.chain([vector.right, vector.left, vector.down, vector.up])
      .filter(legal)
      .shuffle()
      .first()
      .value();
  };


  var line = function(p1, p2) {
    return { start: p1, end: p2 };
  };

  
  var Maze = function(gridw, gridh) {
    var cells = mkarray(gridw, gridh);
    var walls = [];

    function cellat(p) { return cells[p.x][p.y]; }

    function adjacent_list(p) {
      if(arguments.length == 2) {
        p = point(p, arguments[1]);
      }
      
      var lst = [];
      if(p.x > 0) {
        lst.push(p.left());
      }
      if(p.y > 0) {
        lst.push(p.above());
      }
      if(p.x < gridw-1) {
        lst.push(p.right());
      }
      if(p.y < gridh-1) {
        lst.push(p.below());
      }
      return lst;
    }

    function addwalls(cellx, celly) {
      var ws = adjacent_list(cellx, celly);
      for(var i = 0; i < ws.length; i++) {
        if(cells[ws[i].x][ws[i].y] === 0) {
          walls.push(ws[i]);
        }
      }
    }

    function find_maze_neighbors(w) {
      var neighbors = adjacent_list(w.x, w.y);
      return _.filter(neighbors, function(n) {
        return cells[n.x][n.y] === 1;
      });
    }

    function connection_count(x, y) {
      var c = 0;
      var neighbors = adjacent_list(x, y);
      for(var i = 0; i < neighbors.length; i++) {
        c += cellat(neighbors[i]);
      }
      return c;
    }

    function can_break_wall(w) {
      return find_maze_neighbors(w).length ===  1;
    }

    function delist_wall(w) {
      walls = _.filter(walls, function(w2) {
        return !(w.x == w2.x && w.y == w2.y);
      });
    }

    function break_wall(w) {
      cells[w.x][w.y] = 1;
      delist_wall(w);
      addwalls(w.x, w.y);
      return w;
    }


    function layout() {
      var sx = randint(gridw), sy = randint(gridh);
      cells[sx][sy] = 1;
      addwalls(sx, sy);
      
      var i = 0;
      while(walls.length > 0) {
        var w = walls[randint(walls.length)];
        if(can_break_wall(w)) {
          break_wall(w);          
        } else {
          delist_wall(w);
        }
      }
    }

    layout();
    var points = [];
    for(var x = 0; x < gridw; x++) {
      for(var y = 0; y < gridh; y++) {
        if(cells[x][y] && connection_count(x, y) > 1) {
          points.push(point(x, y));
        } else {
          cells[x][y] = 0;
        }
      }
    }


    return {
      points: points,
      grid: cells,

      contains_point: function(p) {
        if(p.x < 0 || p.x >= gridw || p.y < 0 || p.y >= gridh) {
          return false;
        }
        return (this.grid[p.x][p.y] === 1);
      },

      line_segments: function() {
        var self = this;
        function trace(p, v) {
          var q = p.copy();
          while(self.contains_point(q.add(v))) {
            q = q.add(v);
          }
          return line(p, q);
        }

        var lines = [];
        for(var y = 0; y < gridh; y++) {
          for(var x = 0; x < gridw; x++) {
            var p = point(x, y);
            if(this.contains_point(p)) {
              if(!this.contains_point(p.above()) && 
                 this.contains_point(p.below())) {
                lines.push(trace(p, vector(0, 1)));
              }
              if(!this.contains_point(p.left()) &&
                 this.contains_point(p.right())) {
                lines.push(trace(p, vector(1, 0)));
              }
            }
          }
        }

        return lines;
      }
    };
  };


  var Ant = function(position, shape, anim) {
    function legal_move(p, vec) {
      return anim.maze.contains_point(p.add(vec));
    }

    var direction = vector.random_direction(function(v) {
      return legal_move(position, v);
    });

    var ms_per_box = 1500;
    var jitter = 0.05;

    return {
      position: position,
      direction: direction,
      shape: shape,
      anim: anim,
      debugging: 0,
      last_reset: 0,

      move: function(frame) {
        var distance = frame.timeDiff / ms_per_box;

        // account for accumulated floating point error
        if(frame.time - this.last_reset > ms_per_box) {
          this.reset();
          this.last_reset = frame.time;
        }

        this.position = this.position.add(this.direction.scale(distance));

        var vjitter = vector(Math.random() * jitter, Math.random() * jitter);
        var sp = this.anim.screen_position(this.position.add(vjitter));
        
        this.shape.setX(sp.x);
        this.shape.setY(sp.y);
      },

      change_directions: function() {
        var ahead = this.direction, ahead_ok = legal_move(this.position, ahead);
        var reverse = ahead.negate(), 
            reverse_ok = legal_move(this.position, reverse); 

        function choose(p) { return Math.random() < p; }

        var turns = _.shuffle(this.available_turns());
        var legal_moves = turns;
        if(reverse_ok) {
          legal_moves.push(reverse);
        }

        // can keep going, no turns available
        if(ahead_ok && turns.length === 0) {
          return ahead;
        }

        // can't keep going, no turns available
        if(!ahead_ok && turns.length === 0) {
          return reverse;
        }

        // can keep going
        if(ahead_ok && turns.length > 0) {
          if(choose(0.8)) {
            return ahead;
          } 
          return _.first(turns);
        } 

        // can't keep going, can turn or reverse. usually turn
        if(!ahead_ok && turns.length > 0 && reverse_ok) {
          if(choose(0.9)) {
            return _.first(turns);
          }
          return reverse;
        } 

        return ahead;
      },

      available_turns: function() {
        var vecs = [
          this.direction.turn_clockwise(), 
          this.direction.turn_clockwise().negate()
        ];
        var self = this;
        return _.filter(vecs, function(v) { 
          return legal_move(self.position, v); 
        });
      },

      reset: function() {
        this.position = this.position.round();
        this.direction = this.change_directions();
      },

      debug: function() { // get it
        this.shape.fill('blue');
        this.debugging = 1;
      },

      log: function() {
        if(this.debugging) {
          console.log.call(console, arguments);
        }
      }

    };
  };

  var MazeAnimation = {
    mazecolor: '#493C2E',
    bgcolor: '#685642',
    antcolor: '#111',
    boxw: 25,
    boxh: 25,
    tunnel_width: 15,
    tunnel_opacity: 1,
    ant_radius: 5,
    ant_count: 60,
    maze: null,
    ants: null,
    maze_layer: null,
    ant_layer: null,
    animation: null,
    stage: null,

    initialize: function() { 
      var w = $('#colony').width(), h = $('#colony').height();
      var gridw = Math.floor(w / this.boxw), gridh = Math.floor(h / this.boxh);
      var self = this;
      this.maze = new Maze(gridw, gridh);
    
      this.stage = new Kinetic.Stage({
        container: 'colony',
        width: w,
        height: h
      });
  
      this.maze_layer = new Kinetic.Layer();    
      _.each(this.maze.line_segments(), function(l) {
        var s = self.screen_position(l.start);
        var e = self.screen_position(l.end);

        self.maze_layer.add(new Kinetic.Line({
          points: [s.x, s.y, e.x, e.y],
          stroke: self.mazecolor,
          lineCap: 'round',
          strokeWidth: self.tunnel_width,
          opacity: self.tunnel_opacity
        }));
      });      
      this.stage.add(this.maze_layer);

      this.ant_layer = new Kinetic.Layer();
      this.ants = this.create_ants(this.ant_layer);

      this.stage.add(this.ant_layer);
      this.ant_layer.moveToTop();
    },

    screen_position: function(p) {
      return p.scale(this.boxw, this.boxh)
        .add(this.boxw / 2, this.boxh / 2)
        .floor();
    },

    create_ants: function(layer) {
      var anim = this;
      return _.chain(this.maze.points)
        .shuffle()
        .first(this.ant_count)
        .map(function(p) { 
          var sp = anim.screen_position(p);
          var shape = new Kinetic.Circle({
            x: sp.x, y: sp.y,
            radius: anim.ant_radius,
            fill: anim.antcolor
          });
          layer.add(shape);
          return new Ant(p, shape, anim);
        })
        .value();
    },

    animate: function() {
      var layer = this.ant_layer;
      var self = this;

      this.animation = new Kinetic.Animation(function(frame) {
        _.each(self.ants, function(a) {
          a.move(frame);
        });
      }, layer);

      this.animation.start();
    },

    pause: function() { this.animation.stop(); },
    resume: function() { this.animation.start(); },

    restart: function() {
      if(!this.animation) {
        // not animating
        return;
      }

      this.animation.stop();
      this.stage.clear();
      MazeAnimation.initialize();
      MazeAnimation.animate();
    }

  };

  MazeAnimation.initialize();
  MazeAnimation.animate();

  $(document).on({ 
    'show.visibility': function() { MazeAnimation.resume(); },
    'hide.visibility': function() { MazeAnimation.pause(); }
  });
    
  $(window).resizeEnd({ 
    delay: 250
  }, function() { MazeAnimation.restart(); });
         
});