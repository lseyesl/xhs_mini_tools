'use strict';

(function (root) {
  const ink = '#4b392e';
  const cream = '#f0ddae';
  const sage = ['#496354', '#67806a', '#80916b', '#a7aa78'];
  const plum = ['#7f444d', '#a95862', '#c07a7a', '#dfa391', '#ebc2a0'];

  function rng(seed) {
    return function () {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function polygon(g, points, fill, edge) {
    g.beginPath();
    points.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (edge) {
      g.lineJoin = 'round';
      g.lineWidth = 1.6;
      g.strokeStyle = edge;
      g.stroke();
    }
  }

  function oval(g, x, y, rx, ry, fill, rotation) {
    g.beginPath();
    g.ellipse(x, y, rx, ry, rotation || 0, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
  }

  function line(g, points, color, width) {
    g.beginPath();
    points.forEach(function (p, index) { if (index) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();
  }

  function rect(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  }

  function layer(g, points, fill) {
    polygon(g, points.map(function (p) { return [p[0] + 2, p[1] + 3]; }), '#55362648');
    polygon(g, points, fill);
    line(g, points.slice(0, 2), '#fff1cb74', 1.4);
  }

  function roof(g, a, y, paint) {
    const shape = [[-a-7,y+10],[-a+8,y+8],[-a*.6,y-6],[-a*.38,y-24],[a*.28,y-27],[a*.57,y-13],[a-11,y+6],[a+12,y+8],[a+9,y+17],[-a+1,y+21]];
    polygon(g, shape, paint[0], ink);
    g.save();
    g.clip();
    polygon(g,[[-a-8,y+15],[-a+16,y+6],[-a*.38,y-24],[a*.03,y-26],[a*.13,y-4],[a*.64,y+13]],paint[1]);
    polygon(g,[[-a,y+12],[-a*.37,y+7],[a*.57,y+8],[a+10,y+10],[a+12,y+17],[-a,y+21]],paint[2]);
    for (let i = -6; i <= 6; i += 1) {
      const x = i * a / 6;
      line(g,[[x*.49,y-26],[x*.68,y-9],[x,y+19]],'#2e363855',1.8);
      line(g,[[x*.49+2,y-26],[x*.68+2,y-9],[x+2,y+18]],'#e0d6aa44',1);
    }
    g.restore();
    line(g,[[-a*.68,y-4],[-a*.38,y-24],[a*.28,y-27],[a*.57,y-13]],'#ead5a0a6',2);
    line(g,[[-a+3,y+19],[a+8,y+15]],'#c69b62',2.6);
  }

  function architecture(kind) {
    const front = kind === 'gate' ? '#a45440' : kind === 'house' ? '#ded0a5' : '#8a6250';
    const side = kind === 'house' ? '#968963' : '#694a3e';
    const tiles = kind === 'gate' ? ['#415051','#67756a','#50645a'] : ['#355451','#557364','#48645b'];
    return function (g) {
      polygon(g,[[-111,-5],[-73,-25],[93,-25],[122,-12],[92,8],[-90,9]],'#89795f',ink);
      layer(g,[[-107,-8],[89,-8],[120,-19],[102,-8],[87,4],[-89,5]],'#b5a278');
      if (kind !== 'pavilion') {
        polygon(g,[[61,-15],[103,-32],[103,-100],[63,-84]],side,ink);
        polygon(g,[[-87,-9],[-87,-87],[64,-87],[64,-13]],front,ink);
        layer(g,[[-85,-86],[66,-86],[66,-74],[-85,-74]],kind === 'gate' ? '#703932' : '#a27e54');
      } else {
        polygon(g,[[-68,-18],[-32,-36],[91,-37],[66,-16]],'#59433c',ink);
        layer(g,[[-72,-19],[75,-19],[58,-7],[-85,-7]],'#c18c59');
        rect(g,-46,-42,86,6,'#aa795d');
        [-45,-23,0,23,38].forEach(function (x) { rect(g,x,-42,3,23,'#ab795b'); });
      }
      const posts = kind === 'pavilion' ? [-65,55,91,-36] : [-82,58,95];
      posts.forEach(function (x) {
        const back = x > 80 || x === -36;
        const y = back ? -89 : -79;
        layer(g,[[x-6,y],[x+5,y],[x+4,back?-31:-12],[x-6,back?-30:-11]],kind === 'house' ? '#6d755b' : '#9e5944');
      });
      if (kind === 'gate') {
        layer(g,[[-47,-70],[27,-70],[29,-12],[-49,-12]],'#532f2a');
        layer(g,[[-43,-65],[-13,-65],[-13,-16],[-43,-16]],'#a95b46');
        layer(g,[[-10,-65],[23,-65],[23,-16],[-10,-16]],'#9a4b37');
        [-33,-24,1,10].forEach(function (x) {
          [-53,-39,-25].forEach(function (y) { oval(g,x,y,2,2,'#d6a969'); });
        });
        rect(g,-41,-83,63,12,'#4f4c40');
        rect(g,-36,-80,53,4,'#c3a76d');
      } else if (kind === 'house') {
        [-68,-27,14].forEach(function (x) {
          layer(g,[[x,-66],[x+29,-66],[x+29,-31],[x,-31]],'#536658');
          rect(g,x+3,-63,23,29,'#d9b979');
          for (let i = 7; i < 24; i += 6) rect(g,x+i,-63,2,29,'#777a57');
          rect(g,x+3,-50,23,3,'#777a57');
        });
      }
      if (kind !== 'house') {
        [-70,58].forEach(function (x) {
          line(g,[[x,-87],[x,-71]],'#d6b67b',1.5);
          oval(g,x+2,-62,7,9,'#614138');
          oval(g,x,-63,6,8,kind === 'gate' ? '#ca8060' : '#ebbb72');
          line(g,[[x,-69],[x,-57]],'#f2cb89',1.3);
        });
      }
      roof(g,104,-95,tiles);
      if (kind === 'gate') roof(g,70,-133,tiles);
      if (kind === 'pavilion') roof(g,57,-128,tiles);
    };
  }

  function tree(kind, seed) {
    const random = rng(seed);
    const palette = kind === 'plum' ? plum : sage;
    const height = 90 + random() * 28;
    const width = 25 + random() * 19;
    const lobes = Array.from({ length: 20 }, function (_, index) {
      const angle = index / 20 * Math.PI * 2;
      return [Math.cos(angle) * width * (.82 + random() * .22), Math.sin(angle) * height * .30 - height * .65];
    });
    const marks = Array.from({ length: 36 }, function () {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * .86;
      return [Math.cos(angle)*width*distance, -height*.65 + Math.sin(angle)*height*.31*distance, 2.5+random()*5, Math.floor(random()*(palette.length-1))+1];
    });
    return function (g) {
      polygon(g,[[-10,0],[-8,-47],[-30,-68],[-23,-72],[-4,-54],[6,-76],[13,-74],[4,-40],[8,0]],'#795344',ink);
      line(g,[[-8,-3],[-7,-36],[-4,-53]],'#bd8660',2.3);
      polygon(g,lobes.map(function (p) { return [p[0]+6,p[1]+5]; }),palette[0],ink);
      polygon(g,lobes,palette[1],ink);
      line(g,lobes.slice(10,16),'#f4d5a193',2);
      marks.forEach(function (m) {
        oval(g,m[0]+1.7,m[1]+2.2,m[2],m[2]*.8,palette[0]);
        oval(g,m[0],m[1],m[2],m[2]*.74,palette[m[3]],-.5);
        oval(g,m[0]-1,m[1]-1,m[2]*.28,m[2]*.22,cream);
      });
      polygon(g,[[-4,-height*.95],[5,-height*.86],[7,-height*.34],[1,-height*.27]],'#392c2929');
    };
  }

  function bamboo(seed) {
    const random = rng(seed);
    const stems = [-25,-11,5,18].map(function (x) {
      return [x, 76 + random()*46, x + (random()-.5)*31];
    });
    return function (g) {
      stems.forEach(function (stem, i) {
        line(g,[[stem[0],0],[stem[2],-stem[1]]],'#334837',7);
        line(g,[[stem[0]-1,-1],[stem[2]-1,-stem[1]]],sage[2],2);
        for (let j = 0; j < 4; j += 1) {
          const y = -stem[1]*(.39+j*.18);
          const x = stem[0] + (stem[2]-stem[0])*(-y/stem[1]);
          const side = (i+j)%2 ? 1 : -1;
          line(g,[[x,y],[x+side*27,y-8]],sage[0],2.5);
          layer(g,[[x+side*6,y-1],[x+side*23,y-16],[x+side*38,y-14],[x+side*25,y-6]],sage[1+j%3]);
          layer(g,[[x+side*11,y-3],[x+side*25,y+2],[x+side*35,y+14],[x+side*15,y+6]],sage[2]);
        }
      });
    };
  }

  function rock(g) {
    polygon(g,[[-36,0],[-38,-10],[-26,-19],[-23,-36],[-9,-43],[-3,-57],[13,-54],[23,-30],[35,-20],[39,0]],'#7a836d',ink);
    layer(g,[[-35,-9],[-25,-17],[-22,-36],[-9,-42],[-2,-55],[1,-34],[-7,-25],[-6,-10],[-22,-4]],'#a6a58a');
    polygon(g,[[1,-33],[12,-45],[23,-30],[33,-21],[18,-15],[25,-8],[2,-8]],'#65725e');
    layer(g,[[-15,-16],[-5,-26],[7,-26],[5,-19],[-8,-11]],'#c5b892');
  }

  function flowers(g) {
    const random = rng(61);
    for (let i = 0; i < 12; i += 1) {
      const x = (random()-.5)*66;
      const len = 12+random()*21;
      line(g,[[x*.7,0],[x,-len]],sage[0],2.5);
      oval(g,x-2,-len+5,5,2,sage[2],-.4);
      oval(g,x,-len,4,3,plum[1+i%4]);
      oval(g,x-1,-len-1,1.2,1.2,cream);
    }
  }

  function lilies(g) {
    [[-18,-1,11],[0,1,9],[15,-3,13]].forEach(function (pad,index) {
      oval(g,pad[0]+2,pad[1]+2,pad[2],pad[2]*.46,'#3b6159');
      oval(g,pad[0],pad[1],pad[2],pad[2]*.43,index%2 ? '#6f8d70' : '#8a9c78');
      line(g,[[pad[0]-3,pad[1]+1],[pad[0]+3,pad[1]-2]],'#b7b596',1);
    });
    layer(g,[[5,-5],[3,-13],[12,-11],[17,-19],[21,-10],[28,-14],[26,-6],[18,-3]],'#d0988b');
    oval(g,17,-8,3,2,'#ecd19c');
  }

  function wall(g) {
    polygon(g,[[-60,0],[-60,-36],[40,-49],[58,-43],[58,-8]],'#c5b68d',ink);
    layer(g,[[-60,-34],[40,-48],[56,-43],[56,-35],[-60,-24]],'#526d61');
    line(g,[[-59,-25],[56,-36]],'#96a084',2);
    for (let x = -48; x < 56; x += 14) line(g,[[x,-9-x*.11],[x+6,-9-(x+6)*.11]],'#967b61',1.3);
  }

  function bridge(g) {
    polygon(g,[[-72,3],[-48,-17],[-22,-31],[5,-36],[42,-27],[73,-9],[54,4],[26,-13],[-9,-17],[-37,-9],[-51,3]],'#a9926a',ink);
    layer(g,[[-66,0],[-44,-19],[-19,-34],[5,-37],[43,-28],[73,-12],[62,-7],[33,-21],[3,-29],[-19,-26],[-47,-11],[-59,1]],'#d1b384');
    [-54,-29,-3,23,50].forEach(function (x) {
      const y = -15-Math.cos(x/60)*20;
      line(g,[[x,y-9],[x,y+3]],'#694e42',2.8);
    });
    line(g,[[-61,-20],[-30,-41],[-3,-46],[23,-45],[58,-27]],'#705644',3);
    line(g,[[-60,-21],[-30,-42],[-3,-47],[23,-46],[58,-28]],'#d8bd8a',1.4);
  }

  function lantern(g) {
    line(g,[[0,0],[0,-59],[17,-59]],'#6a5038',5);
    line(g,[[-1,0],[-1,-60],[17,-60]],'#c39c6b',1.4);
    layer(g,[[11,-54],[24,-54],[26,-39],[22,-33],[12,-33],[9,-40]],'#c17a48');
    oval(g,17,-44,5,7,'#f1c574');
    line(g,[[17,-35],[17,-29]],'#c68e54',1.8);
  }

  function figure(kind) {
    const costumes = {
      daiyu: ['#55756a','#82a08a','#c5b98d','#b07566'],
      matron: ['#794239','#ab674e','#d2a170','#76836e'],
      zijuan: ['#8a646d','#b9868a','#d9ab9c','#588071'],
      baochai: ['#8f6446','#b8895b','#d9b988','#758068'],
      xiangyun: ['#516875','#788d97','#acc3bb','#a87c64']
    };
    const c = costumes[kind];
    return function (g) {
      polygon(g,[[-27,0],[-30,-8],[-18,-57],[-17,-79],[17,-79],[18,-53],[30,-9],[24,0]],c[0],ink);
      layer(g,[[-17,-52],[16,-53],[21,-6],[7,-1],[-7,-4]],c[1]);
      layer(g,[[-4,-50],[7,-50],[13,-7],[4,-4]],c[2]);
      line(g,[[-15,-48],[-20,-29],[-21,-7]],'#ead7a48f',1.8);
      layer(g,[[-17,-82],[-26,-69],[-29,-47],[-10,-44],[-1,-60],[-7,-78]],c[1]);
      layer(g,[[14,-81],[23,-71],[28,-46],[10,-44],[1,-63],[5,-78]],c[0]);
      layer(g,[[-11,-79],[2,-65],[14,-80],[15,-72],[2,-57],[-14,-73]],c[2]);
      line(g,[[-15,-53],[16,-54]],c[3],3);
      oval(g,0,-91,8,13,'#d6a17a');
      oval(g,-1,-104,17,20,ink);
      oval(g,-3,-125,9,8,'#493a35');
      oval(g,4,-112,11,8,'#584641',-.65);
      oval(g,0,-99,12,14,'#e8bf92');
      polygon(g,[[-14,-105],[-9,-117],[6,-118],[13,-111],[13,-103],[4,-109],[-2,-106],[-10,-105],[-12,-96]],'#51413a');
      line(g,[[-8,-100],[-4,-101]],'#584538',1.1);
      line(g,[[4,-100],[8,-99]],'#584538',1.1);
      line(g,[[-2,-93],[2,-92]],'#a06353',1);
      oval(g,10,-110,4,3,c[3]);
      oval(g,12,-112,2,2,cream);
      oval(g,-7,-94,2.6,1.3,'#cf826e');
      oval(g,8,-94,2.6,1.3,'#cf826e');
      layer(g,[[-11,-52],[9,-56],[16,-46],[-5,-40]],kind === 'xiangyun' || kind === 'daiyu' ? '#daca9e' : c[3]);
      line(g,[[-6,-48],[7,-51]],'#846a52',1.1);
    };
  }

  const depth = 172;
  function makeSprite(draw) {
    const canvas = document.createElement('canvas');
    canvas.width = 268;
    canvas.height = 190;
    const g = canvas.getContext('2d');
    g.translate(134, depth);
    draw(g);
    g.setTransform(1,0,0,1,0,0);
    g.globalCompositeOperation = 'source-atop';
    const random = rng(77);
    for (let i = 0; i < 920; i += 1) {
      rect(g,random()*268,random()*190,1+random()*4,.38,i%2 ? '#fff3cf42' : '#4c392923');
    }
    return canvas;
  }

  const artists = {
    gate: architecture('gate'), house: architecture('house'), pavilion: architecture('pavilion'),
    rock: rock, flowers: flowers, lilies: lilies, wall: wall, bridge: bridge, lantern: lantern,
    daiyu: figure('daiyu'), matron: figure('matron'), zijuan: figure('zijuan'),
    baochai: figure('baochai'), xiangyun: figure('xiangyun')
  };
  for (let i = 0; i < 4; i += 1) {
    artists['plum'+i] = tree('plum',32+i*17);
    artists['elm'+i] = tree('elm',45+i*19);
    artists['bamboo'+i] = bamboo(23+i*31);
  }
  const sprites = {};
  const shadows = {};
  const softPrints = {};
  function sprite(name) {
    if (!sprites[name]) sprites[name] = makeSprite(artists[name]);
    return sprites[name];
  }

  function installCharacter(name, image) {
    const print = document.createElement('canvas');
    print.width = 536;
    print.height = 380;
    const height = 300;
    const width = image.naturalWidth * height / image.naturalHeight;
    print.getContext('2d').drawImage(image, (print.width - width) / 2, depth * 2 - height, width, height);
    sprites[name] = print;
    delete softPrints[name];
    Object.keys(shadows).forEach(function (key) {
      if (key.indexOf(name + '#') === 0) delete shadows[key];
    });
  }

  function softSprite(name) {
    if (!softPrints[name]) {
      const print = sprite(name);
      const canvas = document.createElement('canvas');
      canvas.width = print.width;
      canvas.height = print.height;
      const g = canvas.getContext('2d');
      if ('filter' in g) g.filter = 'blur(2.4px)';
      g.drawImage(print, 0, 0);
      softPrints[name] = canvas;
    }
    return softPrints[name];
  }

  function shadow(name, color) {
    const key = name + color;
    if (!shadows[key]) {
      const image = sprite(name);
      const mask = document.createElement('canvas');
      mask.width = image.width;
      mask.height = image.height;
      const g = mask.getContext('2d');
      g.drawImage(image,0,0);
      g.globalCompositeOperation = 'source-in';
      rect(g,0,0,mask.width,mask.height,color);
      if (color === '#a68a66' || !('filter' in g)) {
        shadows[key] = mask;
      } else {
        const soft = document.createElement('canvas');
        soft.width = mask.width;
        soft.height = mask.height;
        const filtered = soft.getContext('2d');
        filtered.filter = 'blur(1.8px)';
        filtered.drawImage(mask,0,0);
        shadows[key] = soft;
      }
    }
    return shadows[key];
  }

  root.paperPieces = { rng: rng, polygon: polygon, oval: oval, line: line, rect: rect,
    sprite: sprite, installCharacter: installCharacter, softSprite: softSprite, shadow: shadow, depth: depth };
}(window));
