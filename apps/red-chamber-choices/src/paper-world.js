'use strict';

(function (root) {
  const P = root.paperPieces;
  const palettes = [
    { base: '#d9cc9d', back: '#a1a677', bank: '#849467', edge: '#f2daac', road: '#d4ad78', water: '#71948d', deep: '#5c807b', ink: '#69523d', shade: '#65432f' },
    { base: '#cfbb8e', back: '#b6ae85', bank: '#91886b', edge: '#edce99', road: '#c49c70', water: '#869482', deep: '#6b806e', ink: '#5d4536', shade: '#61382e' },
    { base: '#b9a987', back: '#a6a17b', bank: '#838a63', edge: '#d6c293', road: '#bd9c75', water: '#7b9183', deep: '#647c6b', ink: '#573c36', shade: '#593938' },
    { base: '#8b9a85', back: '#667f73', bank: '#52715a', edge: '#c4be9a', road: '#969675', water: '#738b84', deep: '#58786f', ink: '#3a5144', shade: '#344940' },
    { base: '#4d6570', back: '#354f5d', bank: '#536b68', edge: '#98a193', road: '#6a7771', water: '#456673', deep: '#314d63', ink: '#e9cf91', shade: '#202c47' }
  ];
  const landmarks = ['gate', 'plum0', 'house', 'pavilion'];
  const mapLayerSuffixes = ['-ground', '-paths', '-foundations', '-pieces'];
  const foundationRiseTime = 420;
  const buildingLead = 260;
  const pavingTime = 535;
  const pavingCourses = 7;
  const buildingRiseTime = 760;
  const treeGrowthTime = 1180;
  const secondTreeDelay = 110;
  const fullGardenAt = buildingLead+Math.max(stationDelay(3)+buildingRiseTime,
    stationDelay(1)+secondTreeDelay+treeGrowthTime);
  const gardenRevealTime = fullGardenAt+140;

  function stationDelay(index) {
    return 90+240*index;
  }

  const sceneArt = ['rongguo-courtyard', 'flower-mound', 'xiaoxiang-rain', 'moon-pavilion'];
  const scenePartners = ['matron', 'zijuan', 'baochai', 'xiangyun'];
  const mapPlates = {
    // The stops and Bézier handles match scripts/render_map.py.
    // Wildlife anchors are also in image space so they stay over the art when it is cropped.
    // Growth bounds and anchors are pixels from render_map.py --layers.
    portrait: {
      name: 'garden-map-portrait',
      stops: [[.26,.765],[.704,.610],[.307,.473],[.705,.304]],
      controls: [[.435,.81],[.482,.596],[.59,.46]],
      blossoms: [.70,.552],
      pond: [.855,.451],
      foundations: [
        { bounds: [129,1061,399,1245], anchor: [234.0,1223.31] },
        { bounds: [587,900,713,997], anchor: [633.6,975.31] },
        { bounds: [184,615,420,779], anchor: [276.3,756.11] },
        { bounds: [538,354,767,517], anchor: [634.5,485.71] }
      ],
      growth: [
        { station: 0, bounds: [121,983,408,1214], anchor: [245.83,1179.1] },
        { station: 1, bounds: [581,845,651,913], anchor: [615.49,907.57] },
        { station: 1, delay: secondTreeDelay, bounds: [658,844,751,941], anchor: [703.82,934.65] },
        { station: 2, bounds: [180,547,424,747], anchor: [286.33,716.68] },
        { station: 3, bounds: [534,288,771,481], anchor: [637.25,451.88] }
      ]
    },
    landscape: {
      name: 'garden-map-landscape',
      stops: [[.188,.724],[.397,.51],[.60,.683],[.802,.435]],
      controls: [[.29,.745],[.50,.645],[.765,.72]],
      blossoms: [.439,.408],
      pond: [.86,.589],
      foundations: [
        { bounds: [168,492,432,672], anchor: [270.72,650.92] },
        { bounds: [526,385,649,480], anchor: [571.68,458.32] },
        { bounds: [774,476,1004,637], anchor: [864.0,614.02] },
        { bounds: [1061,262,1284,422], anchor: [1154.88,390.82] }
      ],
      growth: [
        { station: 0, bounds: [160,417,440,642], anchor: [282.25,607.82] },
        { station: 1, bounds: [520,333,589,398], anchor: [554.02,392.28] },
        { station: 1, delay: secondTreeDelay, bounds: [596,333,686,425], anchor: [640.14,418.68] },
        { station: 2, bounds: [770,411,1008,605], anchor: [873.78,575.58] },
        { station: 3, bounds: [1057,198,1288,387], anchor: [1157.57,357.84] }
      ]
    }
  };
  const regions = [
    [[-.12,.07],[.32,.02],[.61,.19],[.55,.36],[.82,.5],[.64,.61],[.38,.63],[.43,.89],[.81,.96],[.8,1.13],[-.11,1.1]],
    [[-.30,.01],[.06,.04],[.30,.26],[.22,.53],[.09,.71],[.19,.89],[.05,1.11],[-.30,1.05]],
    [[-.17,.20],[.14,.06],[.38,.16],[.64,.16],[.84,.31],[.97,.54],[.81,.71],[.51,.62],[.39,.78],[.14,.86],[-.17,.68]],
    [[-.28,-.12],[.20,-.1],[.52,.14],[.37,.34],[.20,.57],[.13,.74],[.39,.95],[.24,1.16],[-.2,1.08]],
    [[-.25,.15],[.05,.13],[.40,.26],[.54,.5],[.72,.62],[.61,.79],[.42,1.2],[-.25,1.2]]
  ];
  const walks = [
    [[.14,1.05],[.21,.83],[.52,.66],[.50,.49],[.53,.35]],
    [[.12,1.02],[.24,.79],[.64,.72],[.67,.62],[.36,.51],[.33,.43],[.46,.33]],
    [[.28,1.1],[.17,.85],[.33,.62],[.50,.55],[.53,.41],[.53,.30]],
    [[.20,1.09],[.32,.83],[.57,.74],[.63,.66],[.57,.57],[.50,.49],[.59,.35]]
  ];

  function path(g, points, stroke, width, dash) {
    g.beginPath();
    g.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i += 1) {
      const next = points[i + 1];
      const current = points[i];
      g.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
    }
    const end = points[points.length - 1];
    g.lineTo(end[0], end[1]);
    g.setLineDash(dash || []);
    g.strokeStyle = stroke;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.stroke();
    g.setLineDash([]);
  }

  function region(g, w, h, knots, fill, lip) {
    const points = knots.map(function (p) { return [p[0]*w,p[1]*h]; });
    const start = points[0];
    const last = points[points.length-1];
    g.beginPath();
    g.moveTo((last[0]+start[0])/2,(last[1]+start[1])/2);
    points.forEach(function (p,i) {
      const n = points[(i+1)%points.length];
      g.quadraticCurveTo(p[0],p[1],(p[0]+n[0])/2,(p[1]+n[1])/2);
    });
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (lip) {
      g.strokeStyle = lip;
      g.lineWidth = 2.7;
      g.stroke();
    }
  }

  function layout(w, h) {
    const portrait = w / h < .92;
    if (portrait) return [[.26,.76],[.70,.62],[.29,.48],[.70,.32]];
    return [[.21,.71],[.40,.53],[.59,.65],[.79,.39]];
  }

  function routePosition(leg, t) {
    const u = 1 - t;
    return leg.start.map(function (value, axis) {
      return u*u*value + 2*u*t*leg.control[axis] + t*t*leg.end[axis];
    });
  }

  function randomBetween(min, max) {
    return min + Math.random()*(max-min);
  }

  function smooth(t) {
    const p = Math.max(0, Math.min(1, t));
    return p*p*(3-2*p);
  }

  // Pick a whole path when an event begins, so its movement stays continuous.
  function gardenCurve(path, t) {
    const [start, first, second, end] = path;
    const u = 1-t;
    return [0, 1].map(function (axis) {
      return u*u*u*start[axis] + 3*u*u*t*first[axis] + 3*u*t*t*second[axis] + t*t*t*end[axis];
    });
  }

  function butterflyFlight() {
    const perch = [randomBetween(-39,-24), randomBetween(-22,-11)];
    return {
      duration: randomBetween(4.8,6.6),
      arrival: [[randomBetween(-72,-53),randomBetween(-46,-35)],
        [randomBetween(-67,-37),randomBetween(-68,-49)], [-24,-46], perch],
      departure: [perch, [-31,-27], [randomBetween(-57,-34),randomBetween(-49,-29)],
        [randomBetween(-75,-61),randomBetween(-28,-15)]],
      size: randomBetween(.76,.94), amber: Math.random() < .55
    };
  }

  function koiPass() {
    const path = [[randomBetween(4,17),randomBetween(27,37)],
      [randomBetween(-34,-17),randomBetween(9,23)],
      [randomBetween(-19,5),randomBetween(-32,-18)],
      [randomBetween(9,22),randomBetween(-38,-24)]];
    if (Math.random() < .5) path.reverse();
    return { duration: randomBetween(4.2,6.3), path: path,
      size: randomBetween(.93,1.15), amber: Math.random() < .55 };
  }

  function blossomGust() {
    const drift = randomBetween(-43,-20);
    const petals = Array.from({ length: Math.random() < .48 ? 2 : 3 }, function (_, index) {
      const x = randomBetween(-12,11);
      const y = randomBetween(-8,2);
      const end = [x+drift+randomBetween(-12,5), y+randomBetween(31,45)];
      return { delay: index*randomBetween(.27,.67), fall: randomBetween(1.8,2.8),
        path: [[x,y], [x+randomBetween(-28,0),y+8], [end[0]+12,end[1]-15], end],
        size: randomBetween(.70,1), angle: randomBetween(-1.2,1.2), turn: randomBetween(1.9,3.7) };
    });
    const lastLanding = Math.max.apply(null, petals.map(function (petal) { return petal.delay+petal.fall; }));
    return { duration: lastLanding+2.1, petals: petals };
  }

  function drawButterfly(g, x, y, size, phase, heading, amber) {
    g.save();
    g.translate(x, y);
    g.rotate(heading);
    g.scale(size, size);
    const fold = .34 + .66*Math.abs(Math.cos(phase));
    [-1, 1].forEach(function (side) {
      g.save();
      g.scale(side*fold, 1);
      g.beginPath();
      g.moveTo(0, 1);
      g.bezierCurveTo(4, -10, 15, -12, 13, -4);
      g.quadraticCurveTo(12, 0, 8, 1);
      g.bezierCurveTo(13, 4, 8, 9, 3, 6);
      g.closePath();
      g.fillStyle = amber ? '#bf8b55' : '#9a6664';
      g.fill();
      g.strokeStyle = '#654638';
      g.lineWidth = .85;
      g.stroke();
      P.oval(g, 8.2, -4.5, 3.8, 2.5, amber ? '#e4c896' : '#e2b4a1', -.58);
      P.oval(g, 5.8, 3.8, 2.3, 1.4, '#d0a47b');
      g.restore();
    });
    P.oval(g, 0, 0, 1.05, 4.5, '#614638');
    g.restore();
  }

  function drawKoi(g, x, y, size, heading, flick, warm, surface) {
    P.oval(g, x+2*size, y+3*size, 11*size, 4*size, '#214c454f', heading);
    g.save();
    g.translate(x, y);
    g.rotate(heading);
    g.scale(size, size);
    g.beginPath();
    g.moveTo(-16, -4-flick*.35);
    g.quadraticCurveTo(-25, flick*.5, -16, 4-flick*.35);
    g.strokeStyle = 'rgba(215,232,201,' + (.5*surface) + ')';
    g.lineWidth = .85;
    g.stroke();
    g.beginPath();
    g.moveTo(-5,0);
    g.quadraticCurveTo(-10,flick*.55,-16,flick-4);
    g.quadraticCurveTo(-17,flick,-13,flick+1);
    g.quadraticCurveTo(-16,flick+3,-14,flick+5);
    g.quadraticCurveTo(-9,flick*.5,-5,2);
    g.fillStyle = warm ? '#bd906d' : '#b4b99d';
    g.fill();
    P.oval(g, .3,-2.7,4.1,1.35,'#a3866d',-.4);
    P.oval(g, -1,2.6,3.6,1.35,'#a3866d',.44);
    P.oval(g, 1,0,8.7,3.9,'#766751');
    P.oval(g, 1.3,-.45,8.2,3.55,warm ? '#d5a67e' : '#e2d7b8');
    P.oval(g, 3,-1,3.2,2.25,warm ? '#a55c49' : '#b37960',-.32);
    P.oval(g, -3.5,.8,2.4,1.45,'#a4715a');
    P.oval(g, 6.6,-1.25,.75,.65,'#534c3a');
    g.restore();
  }

  function paintFlight(g, flight, age, anchor, scale) {
    const t = age/flight.duration;
    const approaching = t < .44;
    const path = approaching ? flight.arrival : flight.departure;
    const progress = approaching ? 1-Math.pow(1-t/.44,2) : Math.pow(Math.max(0,(t-.64)/.36),2);
    const point = gardenCurve(path, progress);
    const perched = t >= .44 && t < .64;
    const flutter = perched ? Math.PI*.42 + .18*Math.sin(age*3) : age*24;
    const x = anchor[0]+point[0]*scale;
    const y = anchor[1]+(point[1]+(perched ? 0 : Math.sin(age*8)*1.7))*scale;
    g.globalAlpha = smooth(t/.10)*smooth((1-t)/.14);
    P.oval(g,x+3*scale,y+(perched ? 6 : 14)*scale,5*scale,1.8*scale,'#564a3538');
    // Both curves meet at the same perch with the same body tilt.
    const tilt = approaching ? .46*(1-progress) : -.48*progress;
    drawButterfly(g,x,y,scale*flight.size,flutter,tilt,flight.amber);
  }

  function paintKoi(g, pass, age, anchor, scale) {
    const t = age/pass.duration;
    const point = gardenCurve(pass.path,t);
    const before = gardenCurve(pass.path,Math.max(0,t-.005));
    const after = gardenCurve(pass.path,Math.min(1,t+.005));
    const heading = Math.atan2(after[1]-before[1],after[0]-before[0]);
    const surface = smooth(t/.29)*smooth((1-t)/.30);
    g.globalAlpha = Math.pow(surface,.8)*.90;
    drawKoi(g,anchor[0]+point[0]*scale,anchor[1]+point[1]*scale,
      scale*pass.size,heading,Math.sin(age*9)*2.4,pass.amber,surface);
  }

  function paintPetals(g, gust, age, anchor, scale) {
    gust.petals.forEach(function (petal) {
      const elapsed = age-petal.delay;
      if (elapsed <= 0 || elapsed >= petal.fall+2.1) return;
      const t = Math.min(1,elapsed/petal.fall);
      const point = gardenCurve(petal.path,t);
      const angle = petal.angle+petal.turn*t;
      const flutter = .44+.56*Math.abs(Math.cos(t*8+petal.angle));
      g.save();
      g.globalAlpha = smooth(elapsed/.25)*smooth((petal.fall+2.1-elapsed)/.9);
      g.translate(anchor[0]+point[0]*scale,anchor[1]+point[1]*scale);
      const size = scale*petal.size;
      P.oval(g,2*size,(2+7*(1-t))*size,4.9*size,1.5*size,'#6547373d',angle);
      g.rotate(angle);
      g.scale(size,size*flutter);
      g.beginPath();
      g.moveTo(-4,0);
      g.bezierCurveTo(-1,-3.8,4,-3.8,5,-1.1);
      g.quadraticCurveTo(5.4,0,4.15,.35);
      g.quadraticCurveTo(5.1,2,2.7,2.7);
      g.quadraticCurveTo(-.5,3.9,-4,0);
      g.fillStyle = '#d39186';
      g.fill();
      P.oval(g,1,-.6,2.6,.75,'#f0c1a4',-.22);
      g.restore();
    });
  }

  function newMapLife() {
    return [
      { start: randomBetween(1.2,3.1), wait: [5,12], make: butterflyFlight, paint: paintFlight, anchor: 'blossoms' },
      { start: randomBetween(2.8,5.3), wait: [5,11], make: koiPass, paint: paintKoi, anchor: 'pond' },
      { start: randomBetween(1.6,4.2), wait: [4,10], make: blossomGust, paint: paintPetals, anchor: 'blossoms' }
    ];
  }

  function makeWorld(canvas, onMapLayout) {
    const g = canvas.getContext('2d');
    const floor = document.createElement('canvas');
    const bg = floor.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let w;
    let h;
    let scale;
    let density;
    let scene = -1;
    let count = 0;
    let station = 0;
    let journey = null;
    let route = [];
    let opened = null;
    let stationsOpened = null;
    let pendingReveal = null;
    let revealTimer = 0;
    let growthPlaying = false;
    let frame = 0;
    let lastFrame = 0;
    let objects = [];
    let settled = false;
    let map = [];
    let mapArtwork = null;
    let mapLife = [];
    let mapLifeShown = false;
    let particles = [];
    let tone = palettes[0];
    const images = {};

    function loadArt(name, portrait) {
      if (images[name]) return;
      const image = new Image();
      images[name] = image;
      image.addEventListener('load', function () {
        if (portrait) P.installCharacter(name, image);
        if (scene === -1 && !journey && name === mapPlate().name) {
          resize();
          onMapLayout();
        }
        if (scene === -1 && pendingReveal && growthAssetsReady()) finishStationReveal();
        if (name === sceneArt[scene] || name === 'daiyu' || name === scenePartners[scene]) {
          still = null;
          settled = false;
          if (!frame) frame = requestAnimationFrame(tick);
        }
      });
      image.src = './assets/papercraft/' + name + '.webp';
    }

    function positions() { return map; }

    function mapPlate() {
      return mapPlates[w/h < .92 ? 'portrait' : 'landscape'];
    }

    function growthAssetsReady() {
      const name = mapPlate().name;
      return [''].concat(mapLayerSuffixes).every(function (suffix) {
        const image = images[name+suffix];
        return image && image.complete && image.naturalWidth;
      });
    }

    function strokeRoute(legs, color, width, dash, context = bg) {
      if (!legs.length) return;
      context.beginPath();
      legs.forEach(function (leg) {
        context.moveTo(leg.start[0],leg.start[1]);
        context.quadraticCurveTo(leg.control[0], leg.control[1], leg.end[0], leg.end[1]);
      });
      context.strokeStyle = color;
      context.lineWidth = width * scale;
      context.lineCap = 'round';
      context.setLineDash(dash ? dash.map(function (size) { return size * scale; }) : []);
      context.stroke();
      context.setLineDash([]);
    }

    function drawMapGround(context, image) {
      const art = mapArtwork;
      context.drawImage(image,art.x,art.y,art.width,art.height);
      strokeRoute(route,'#745440a8',1.4,[2,5],context);
      strokeRoute(route.slice(0,count),'#9d5338',2.4,[4,5],context);
      shadeMap(context);
    }

    function shadeMap(context) {
      const shade = context.createLinearGradient(0,0,0,h*.25);
      shade.addColorStop(0,'#29241a9e');
      shade.addColorStop(1,'#29241a00');
      P.rect(context,0,0,w,h*.25,shade);
    }

    function layGround() {
      if (mapArtwork) {
        drawMapGround(bg,mapArtwork.image);
        return;
      }
      const water = [[.74,-.2],[1.17,-.12],[1.16,1.15],[.83,1.15],[.88,.91],[.70,.74],[.74,.6],[.58,.46],[.65,.34],[.91,.29],[.94,.12]];
      P.rect(bg,0,0,w,h,tone.base);
      region(bg,w,h,regions[scene+1],tone.back,'#ead4a04f');
      region(bg,w,h,[[-.18,.13],[.13,.16],[.26,.34],[.23,.47],[.04,.62],[-.13,.52]],tone.bank,'#d2bf8b88');
      if (scene === -1) region(bg,w,h,[[.41,-.24],[.78,-.1],[.68,.14],[.41,.24],[.28,.12]],tone.bank,'#d2bf8b75');
      if (scene === 0 || scene === 2) {
        region(bg,w,h,[[.13,.43],[.63,.34],[.96,.53],[.81,.68],[.35,.82],[.05,.69]],tone.edge,'#78684c63');
        region(bg,w,h,[[.15,.45],[.63,.36],[.94,.53],[.80,.66],[.35,.80],[.07,.69]],tone.road);
      }
      if (scene === 1) {
        region(bg,w,h,[[.17,.47],[.44,.33],[.73,.41],[.83,.65],[.66,.76],[.46,.61],[.20,.66]],'#b4987b','#d8ba8b92');
      }
      if (scene === -1 || scene === 3) {
        region(bg,w,h,water,tone.bank,tone.edge);
        bg.save();
        bg.translate(w*.027,0);
        region(bg,w,h,water,tone.water,tone.edge);
        bg.clip();
        region(bg,w,h,[[.87,-.3],[1.24,-.12],[1.26,1.3],[.91,1.2],[.98,.79],[.81,.64],[.77,.46],[.96,.34]],tone.deep);
        const r = P.rng(82);
        for (let i = 0; i < 270; i += 1) {
          const x = r()*w;
          const y = r()*h;
          const length = 5 + r()*43*scale;
          P.line(bg,[[x,y],[x+length*.39,y-1],[x+length,y]],i%4 ? '#e3e9bf43' : '#284b5166',.65+r()*1.4);
        }
        bg.restore();
      }
      if (scene === -1) {
        strokeRoute(route, tone.edge, 22);
        strokeRoute(route, tone.road, 14);
        strokeRoute(route, '#76574d', 1.8, [3, 6]);
        strokeRoute(route.slice(0, count), '#974e37', 3.2, [6, 5]);
      } else {
        const walk = walks[scene].map(function (p) { return [p[0]*w,p[1]*h]; });
        path(bg,walk,tone.edge,71*scale);
        path(bg,walk,tone.road,66*scale);
        if (scene === 0 || scene === 2) {
          for (let i = 0; i < 12; i += 1) {
            const x = w*(.12+i*.068);
            P.line(bg,[[x,h*.56],[x-w*.13,h*.76]],'#67504141',1.2);
          }
          for (let i = 0; i < 4; i += 1) {
            const y = h*(.57+i*.048);
            P.line(bg,[[w*.04,y],[w*.64,y+h*.014]],'#67504141',1.2);
          }
        }
        if (scene === 1) {
          const blossoms = P.rng(461);
          for (let i = 0; i < 100; i += 1) {
            const y = h*(.33+blossoms()*.40);
            const x = w*(.28+blossoms()*.47);
            P.oval(bg,x,y,(.9+blossoms()*2.3)*scale,1.05*scale,i%3 ? '#e9bd9a9c' : '#b2696291',blossoms()*6);
          }
        }
        if (scene === 3) {
          const x = w*.78;
          const y = h*.20;
          P.oval(bg,x,y,40*scale,40*scale,'#e1c88b48');
          P.oval(bg,x-1,y-1,34*scale,34*scale,'#ead39a');
          P.oval(bg,x-8*scale,y+4*scale,9*scale,5*scale,'#b1ab84');
          P.oval(bg,x+5*scale,y-10*scale,7*scale,4*scale,'#b1ab84');
          for (let i = 0; i < 13; i += 1) {
            const yLine = h*(.41+i*.022);
            const width = scale*(14+(i*17)%40);
            P.line(bg,[[x-width/2,yLine],[x+width/2,yLine]],'#ebce7e83',1.7);
          }
        }
      }
      const r = P.rng(1241+scene);
      const amount = Math.min(6500,Math.ceil(w*h/95));
      for (let i = 0; i < amount; i += 1) {
        const x = r()*w;
        const y = r()*h;
        P.line(bg,[[x,y],[x+1+r()*6,y+(r()-.5)*1.8]],i%3 ? '#f2e4b431' : '#51433a27',.35+r()*.65);
      }
      const light = bg.createRadialGradient(w*.42,h*.46,Math.min(w,h)*.22,w*.42,h*.46,Math.max(w,h)*.65);
      light.addColorStop(0,'#f7dda600');
      light.addColorStop(1,tone.shade+'38');
      P.rect(bg,0,0,w,h,light);
      if (scene === -1 && w/h >= .92) {
        bg.strokeStyle = '#67563d71';
        bg.lineWidth = 1;
        bg.strokeRect(15,15,w-30,h-30);
        bg.strokeStyle = '#79604742';
        bg.strokeRect(21,21,w-42,h-42);
      }
    }

    function compose() {
      if (mapArtwork) {
        objects = [];
        return;
      }
      const things = [];
      const wide = w/h >= .92;
      function put(kind, x, y, size, phase) {
        const depth = .78 + y*.37;
        things.push({ name: kind, x: x*w, y: y*h, size: size*scale*depth, phase: phase || 0,
          actor: kind === 'daiyu' || kind === scenePartners[scene] });
      }
      const seed = P.rng(836+scene*73);
      const plants = [
        ['plum0','plum1','elm2','bamboo0','rock','flowers'],
        ['elm2','bamboo0','wall','elm0','rock','flowers'],
        ['plum0','plum1','plum2','plum3','rock','flowers'],
        ['bamboo0','bamboo1','bamboo2','bamboo3','rock','flowers'],
        ['bamboo2','elm1','bamboo3','elm2','rock','flowers']
      ][scene+1];
      const patches = scene === -1 && !wide ?
        [[.10,.30],[.88,.42],[.13,.61],[.93,.72],[.56,.83],[.52,.42]] :
        [[.02,.36],[.15,.48],[.77,.31],[.91,.63],[.24,.90],[.72,.83],[.57,.27],[.24,.61],[.77,.66]];
      patches.forEach(function (center,index) {
        const many = scene === -1 ? 8 : 6;
        for (let j = 0; j < many; j += 1) {
          const x = center[0] + (seed()-.5)*(wide ? .19 : .30);
          const y = center[1] + (seed()-.5)*.17;
          const water = (scene === -1 || scene === 3) && x > (y > .83 ? .91 : .79);
          const kind = water ? 'lilies' : plants[(j+index)%plants.length];
          put(kind,x,y,.23+seed()*(scene === -1 ? .38 : .69),.05 + (j%4)*.045);
        }
      });
      if (scene === -1) {
        map.forEach(function (p,i) {
          put(landmarks[i],p[0],p[1]-.012,i===1 ? 1.12 : .77,i*.065);
          put(i===1 ? 'plum2' : 'lantern',p[0] + (i%2 ? .09 : -.09),p[1]-.011,.46,i*.067);
          put('rock',p[0] + (i%2 ? -.11 : .10),p[1]+.021,.36,i*.067);
        });
        put('bridge',wide ? .75 : .55,wide ? .52 : .43,.52,.12);
        put('bamboo2',.02,.99,1.3,.07);
        put('plum3',.98,.99,1.22,.12);
        put('wall',.29,.27,.39,.09);
        put('house',.23,.22,.44,.09);
        put('wall',.13,.25,.48,.09);
      } else {
        const mid = wide ? .53 : .51;
        const characterY = wide ? .63 : .59;
        if (scene === 0) {
          put('gate',mid,.45,1.43,0);
          put('house',wide ? .76 : .94,.34,.85,0);
          put('wall',wide ? .33 : .13,.41,.84,.03);
          put('lantern',mid-.21,.54,.91,.14);
          put('lantern',mid+.22,.52,.87,.16);
          put('rock',mid-.24,.58,.56,.12);
          put('rock',mid+.24,.59,.59,.14);
          put('matron',mid+.12,characterY,1.16,.22);
        } else if (scene === 1) {
          put('plum0',mid,.50,1.97,.08);
          put('plum3',mid-.25,.43,1.52,0);
          put('plum2',mid+.27,.48,1.61,.06);
          put('plum1',mid-.10,.38,1.21,.03);
          put('rock',mid+.16,.55,.62,.15);
          put('flowers',mid+.05,.62,.69,.13);
          put('zijuan',mid+.17,characterY-.02,1.15,.22);
        } else if (scene === 2) {
          put('house',mid,.47,1.45,.02);
          put('bamboo0',mid-.22,.49,1.38,.05);
          put('bamboo2',mid+.22,.44,1.31,.03);
          put('bamboo3',mid+.28,.56,1.45,.11);
          put('wall',mid-.25,.51,.89,.07);
          put('lantern',mid+.11,.54,.68,.13);
          put('baochai',mid+.13,characterY,1.14,.23);
        } else {
          put('bridge',mid+.26,.37,.93,.03);
          put('pavilion',mid,.49,1.48,.04);
          put('lantern',mid-.23,.51,.91,.12);
          put('lantern',mid+.16,.56,.77,.13);
          put('bamboo1',mid-.27,.55,1.02,.09);
          put('xiangyun',wide ? .47 : .48,characterY+.033,1.10,.22);
          put('rock',mid-.18,.65,.64,.17);
        }
        put('daiyu',scene === 3 ? (wide ? .34 : .27) : mid-.07,characterY+.022,1.25,.21);
        put('bamboo3',.023,.92,1.6,.10);
        put(scene===1 ? 'plum1' : 'elm3',.986,.95,1.49,.17);
      }
      objects = things.sort(function (a,b) { return a.y-b.y; });
      const r = P.rng(771);
      particles = Array.from({ length: scene===2 ? 47 : 20 }, function () {
        return [r(),r(),.35+r()*.9,.08+r()*.6];
      });
    }

    function resize() {
      w = Math.max(1,canvas.clientWidth);
      h = Math.max(1,canvas.clientHeight);
      density = Math.min(window.devicePixelRatio || 1, 1.5, 1440/w, 1330/h);
      scale = Math.min(w / (w/h < .92 ? 440 : 690), h / 660);
      map = layout(w,h);
      mapArtwork = null;
      let controls = null;
      let points = map.map(function (point) { return [point[0]*w, point[1]*h]; });
      if (scene === -1) {
        const plate = mapPlate();
        if (!reduced.matches) {
          mapLayerSuffixes.forEach(function (suffix) { loadArt(plate.name+suffix,false); });
        }
        loadArt(plate.name, false);
        const image = images[plate.name];
        if (image.complete && image.naturalWidth) {
          const cover = Math.max(w / image.naturalWidth, h / image.naturalHeight);
          const width = Math.min(image.naturalWidth * cover, w * 1.28);
          const height = Math.min(image.naturalHeight * cover, h * 1.28);
          const x = (w - width) / 2;
          const y = (h - height) / 2;
          const project = function (p) { return [x+p[0]*width, y+p[1]*height]; };
          mapArtwork = { image: image, x: x, y: y, width: width, height: height, plate: plate,
            blossoms: project(plate.blossoms), pond: project(plate.pond) };
          points = plate.stops.map(project);
          controls = plate.controls.map(project);
          map = points.map(function (p) { return [p[0]/w,p[1]/h]; });
        }
      }
      route = points.slice(1).map(function (end, index) {
        const start = points[index];
        return {
          start: start,
          end: end,
          control: controls ? controls[index] : [(start[0]+end[0])/2, (start[1]+end[1])/2+h*.045],
          distance: Math.hypot(end[0]-start[0], end[1]-start[1])
        };
      });
      canvas.width = floor.width = Math.round(w*density);
      canvas.height = floor.height = Math.round(h*density);
      g.setTransform(density,0,0,density,0,0);
      bg.setTransform(density,0,0,density,0,0);
      compose();
      layGround();
      draw(900);
    }

    function settle(age, delay) {
      const t = Math.max(0,Math.min(1,(age/1000-delay)/.66));
      if (t===1 || reduced.matches) return 1;
      // Damped rise, with one small overshoot as cardstock stops.
      return 1 - Math.exp(-6.7*t)*Math.cos(8.6*t);
    }

    function drawPiece(item, age, drawShadow) {
      const size = item.size;
      const progress = settle(age,item.phase);
      const fold = (1-progress)*Math.PI/2;
      const pitch = .75;
      const yScale = Math.cos(fold+pitch)/Math.cos(pitch);
      g.save();
      g.translate(item.x,item.y);
      if (drawShadow) {
        const mask = P.shadow(item.name,tone.shade);
        g.globalAlpha = .20 + .19*Math.max(0,progress);
        g.transform(size,0,-.64*size,.29*size,0,0);
        g.drawImage(mask,-134,-P.depth,268,190);
      } else {
        const blur = item.y > h*.86 || (item.y < h*.30 && item.size < .67);
        const paper = yScale < 0 ? P.shadow(item.name,'#a68a66') :
          (blur ? P.softSprite(item.name) : P.sprite(item.name));
        g.transform(size,0,Math.sin(fold)*size*.27,size*yScale,0,0);
        g.drawImage(paper,-134,-P.depth,268,190);
      }
      g.restore();
    }

    function updateMapLife(time) {
      let active = false;
      mapLife.forEach(function (slot) {
        if (slot.event && time >= slot.start+slot.event.duration) {
          slot.event = null;
          slot.start = time+randomBetween(slot.wait[0],slot.wait[1]);
        }
        if (time < slot.start) return;
        if (!slot.event) {
          slot.start = time;
          slot.event = slot.make();
        }
        active = true;
      });
      return active;
    }

    function drawMapLife(time) {
      const size = Math.min(1.18,Math.max(.72,scale));
      mapLife.forEach(function (slot) {
        if (!slot.event) return;
        g.save();
        slot.paint(g,slot.event,time-slot.start,mapArtwork[slot.anchor],size);
        g.restore();
      });
    }

    function tracePavedStrip(leg, from, to, halfWidth) {
      const steps = Math.max(2,Math.ceil(24*(to-from)));
      const edges = [[],[]];
      for (let i = 0; i <= steps; i++) {
        const t = from+(to-from)*i/steps;
        const [x,y] = routePosition(leg,t);
        const dx = (1-t)*(leg.control[0]-leg.start[0])+t*(leg.end[0]-leg.control[0]);
        const dy = (1-t)*(leg.control[1]-leg.start[1])+t*(leg.end[1]-leg.control[1]);
        const offset = halfWidth/Math.hypot(dx,dy);
        edges[0].push([x-dy*offset,y+dx*offset]);
        edges[1].push([x+dy*offset,y-dx*offset]);
      }
      const contour = edges[0].concat(edges[1].reverse());
      g.moveTo(contour[0][0],contour[0][1]);
      contour.slice(1).forEach(function (point) { g.lineTo(point[0],point[1]); });
      g.closePath();
    }

    function drawPavedPaths(age, atlas, plateWidth) {
      const art = mapArtwork;
      const halfWidth = 32*art.width/plateWidth;
      const visible = [];
      const laying = [];
      g.save();
      g.beginPath();
      route.forEach(function (leg,index) {
        const progress = smooth((age-stationDelay(index)-175)/pavingTime);
        const courses = Math.floor(progress*pavingCourses);
        const laid = courses/pavingCourses;
        if (progress > laid) {
          laying.push({ leg: leg, from: laid, to: (courses+1)/pavingCourses,
            landing: smooth(progress*pavingCourses-courses) });
        }
        if (!laid) return;
        tracePavedStrip(leg,0,laid,halfWidth);
        const control = leg.start.map(function (start,axis) {
          return start+(leg.control[axis]-start)*laid;
        });
        visible.push({ start: leg.start, control: control, end: routePosition(leg,laid) });
      });
      if (visible.length) {
        g.clip();
        g.drawImage(atlas,art.x,art.y,art.width,art.height);
      }
      g.restore();
      laying.forEach(function (course) {
        g.save();
        g.translate(0,-7*scale*(1-course.landing));
        g.globalAlpha = course.landing;
        g.beginPath();
        tracePavedStrip(course.leg,course.from,course.to,halfWidth);
        g.clip();
        g.drawImage(atlas,art.x,art.y,art.width,art.height);
        g.restore();
      });
      strokeRoute(visible,'#745440a8',1.4,[2,5],g);
      strokeRoute(visible.slice(0,count),'#9d5338',2.4,[4,5],g);
    }

    function drawGardenGrowth(age) {
      const art = mapArtwork;
      const base = images[art.plate.name+'-ground'];
      const pieces = images[art.plate.name+'-pieces'];
      const foundations = images[art.plate.name+'-foundations'];
      g.drawImage(base,art.x,art.y,art.width,art.height);
      drawPavedPaths(age,images[art.plate.name+'-paths'],pieces.naturalWidth);
      g.save();
      g.translate(art.x,art.y);
      g.scale(art.width/pieces.naturalWidth,art.height/pieces.naturalHeight);
      art.plate.foundations.forEach(function (item,index) {
        const elapsed = age-stationDelay(index);
        if (elapsed > 0) drawFoundation(foundations,item,elapsed);
      });
      art.plate.growth.forEach(function (item) {
        const elapsed = age-stationDelay(item.station)-buildingLead-(item.delay || 0);
        if (elapsed <= 0) return;
        if (item.station === 1) drawGrowingTree(pieces,item,elapsed);
        else drawRisingHouse(pieces,item,elapsed);
      });
      g.restore();
      shadeMap(g);
      if (age > fullGardenAt) {
        g.save();
        g.globalAlpha = smooth((age-fullGardenAt)/(gardenRevealTime-fullGardenAt));
        g.drawImage(floor,0,0,w,h);
        g.restore();
      }
    }

    function drawFoundation(atlas, item, elapsed) {
      const t = Math.min(1,elapsed/foundationRiseTime);
      const seated = smooth(t/.76);
      const size = .55+.45*smooth(t);
      const span = item.bounds[2]-item.bounds[0];
      const lift = (1-seated)*span*.10;
      const [x,y] = item.anchor;
      g.save();
      g.globalAlpha = smooth(t/.24);
      P.oval(g,x,y,span*.36*size,span*.08*size,'#6048333d',.23);
      drawGardenPiece(atlas,item,size, .47+.53*seated,lift);
      g.restore();
    }

    function drawRisingHouse(atlas, item, elapsed) {
      const t = Math.min(1,elapsed/buildingRiseTime);
      const rise = smooth(t);
      const settle = .055*Math.sin(Math.PI*smooth((t-.56)/.44));
      const width = .32+.68*rise+settle;
      const height = .20+.80*rise+settle;
      const x = item.anchor[0];
      const y = item.anchor[1];
      const span = item.bounds[2]-item.bounds[0];
      g.save();
      g.globalAlpha = smooth(t/.15);
      P.oval(g,x+span*.04*rise,y+span*.012,span*.34*width,span*.056*width,'#61503b42',.23);
      drawGardenPiece(atlas,item,width,height);
      g.restore();
    }

    function drawGrowingTree(atlas, item, elapsed) {
      const t = Math.min(1,elapsed/treeGrowthTime);
      const x = item.anchor[0];
      const y = item.anchor[1];
      const span = item.bounds[2]-item.bounds[0];
      const soil = smooth(t/.19)*(1-smooth((t-.68)/.24));
      const sprout = smooth((t-.15)/.35);
      const crown = smooth((t-.50)/.50);
      g.save();
      g.translate(x,y);
      g.scale(span/76,span/76);
      P.oval(g,2,2,8+5*soil,3+soil,'#55473336');
      if (soil > 0) {
        g.save();
        g.globalAlpha = soil;
        P.polygon(g,[[-9,1],[-5,-3],[1,-2],[6,-4],[11,0],[5,4],[-4,4]],'#9d7754','#76593e');
        P.line(g,[[-7,0],[-1,1],[2,-2],[7,-2]],'#574630',1);
        g.restore();
      }
      if (sprout > 0 && crown < 1) {
        g.save();
        g.globalAlpha = 1-smooth((t-.55)/.23);
        const height = 32*sprout;
        P.line(g,[[0,1],[2,-height*.42],[1,-height*.73],[3,-height]],'#536938',2.5);
        const leaf = smooth((t-.25)/.23);
        if (leaf > 0) {
          P.oval(g,-4*leaf,-height*.82,8*leaf,3.5*leaf,'#768e4d',.44);
          P.oval(g,9*leaf,-height,7.5*leaf,3.7*leaf,'#9faa69',-.52);
          P.line(g,[[2,-height*.88],[7*leaf,-height-1.5]],'#c4c38b',.85);
        }
        const branch = smooth((t-.39)/.23);
        if (branch > 0) {
          const tip = -height*.57-7*branch;
          P.line(g,[[1,-height*.57],[-5*branch,tip+2],[-9*branch,tip]],'#69784a',1.55);
          P.oval(g,-11*branch,tip-1,4.4*branch,2.4*branch,'#82975a',.39);
        }
        g.restore();
      }
      g.restore();
      if (crown > 0) {
        g.save();
        g.globalAlpha = smooth((t-.50)/.22);
        drawGardenPiece(atlas,item,.31+.69*crown,.36+.64*crown);
        g.restore();
      }
    }

    function drawGardenPiece(atlas, item, width, height, lift = 0) {
      const [left,top,right,bottom] = item.bounds;
      const [x,y] = item.anchor;
      g.save();
      g.translate(x,y-lift);
      g.scale(width,height);
      g.drawImage(atlas,left,top,right-left,bottom-top,left-x,top-y,right-left,bottom-top);
      g.restore();
    }

    function draw(age, lifeTime) {
      if (!g) return;
      const image = images[sceneArt[scene]];
      const illustrated = !!(image && image.complete && image.naturalWidth);
      const scenery = mapArtwork ? 'model' : illustrated ? 'illustrated' : 'paper';
      if (canvas.parentElement.dataset.scenery !== scenery) canvas.parentElement.dataset.scenery = scenery;
      const pieces = illustrated ? objects.filter(function (item) { return item.actor; }) : objects;
      if (illustrated) {
        const fit = Math.max(w / image.naturalWidth, h / image.naturalHeight);
        const width = image.naturalWidth * fit;
        const height = image.naturalHeight * fit;
        const y = Math.max(h-height, Math.min(0, (h-height)*.6));
        g.drawImage(image, (w-width)/2, y, width, height);
        const shade = g.createLinearGradient(0,0,0,h*.25);
        shade.addColorStop(0,'#1d221dba');
        shade.addColorStop(.57,'#24262165');
        shade.addColorStop(1,'#29282200');
        P.rect(g,0,0,w,h*.25,shade);
      } else if (mapArtwork && !reduced.matches && growthAssetsReady() &&
          (stationsOpened === null || (growthPlaying && lastFrame-stationsOpened < gardenRevealTime))) {
        drawGardenGrowth(stationsOpened === null ? 0 : Math.max(0,lastFrame-stationsOpened));
      } else {
        g.drawImage(floor,0,0,w,h);
      }
      mapLifeShown = mapArtwork !== null && lifeTime !== undefined;
      if (mapLifeShown) drawMapLife(lifeTime);
      pieces.forEach(function (item) {
        if (item.name === 'lilies') return;
        P.oval(g,item.x+item.size*3,item.y+item.size*2,item.size*26,item.size*5,tone.shade+'20');
        P.oval(g,item.x+item.size*2,item.y+item.size,item.size*20,item.size*3,tone.shade+'35');
        drawPiece(item,age,true);
      });
      const walker = scene === -1 ? mapWalker() : null;
      let drawn = false;
      pieces.forEach(function (item) {
        if (walker && !drawn && item.y > walker.y) {
          drawWalker(walker);
          drawn = true;
        }
        drawPiece(item,age,false);
      });
      if (walker && !drawn) drawWalker(walker);
    }

    function mapWalker() {
      const leg = journey && route[journey.from];
      const t = journey ? journey.progress : 0;
      const point = leg ? routePosition(leg, t) : [map[station][0]*w, map[station][1]*h];
      const size = .52*scale*(.78 + .37*point[1]/h);
      const swing = leg ? Math.sin(leg.distance * t / (6*scale)) * Math.min(1, t*12, (1-t)*12) : 0;
      return { x: point[0], y: point[1], size: size, swing: swing,
        direction: leg && leg.end[0] < leg.start[0] ? -1 : 1 };
    }

    function drawWalker(walker) {
      const size = walker.size;
      P.oval(g, walker.x+4*size, walker.y+size, 22*size, 5*size, tone.shade+'60');
      g.save();
      g.translate(walker.x, walker.y - Math.abs(walker.swing)*3*size);
      g.rotate(walker.swing * .045);
      g.scale(size*walker.direction, size);
      [-7, 7].forEach(function (foot, index) {
        const stride = walker.swing*(index ? -1 : 1);
        P.oval(g, foot + 7*stride, -1 - Math.max(0, stride)*3, 5, 2.5, '#4b392e');
      });
      g.drawImage(P.sprite('daiyu'), -134, -P.depth-2,268,190);
      g.restore();
    }

    function atmosphere(now) {
      if (scene < 1 || reduced.matches) return;
      const t = now/1000;
      particles.forEach(function (p,i) {
        const x = ((p[0]+t*p[3]*.025)%1)*w;
        const y = ((p[1]+t*p[2]*(scene===2 ? .20 : .032))%1)*h;
        if (scene === 1) {
          P.oval(g,x,y,3.2*scale,1.4*scale,'#f3c0a1bf',Math.sin(t+i));
        } else if (scene === 2) {
          P.line(g,[[x,y],[x-4*scale,y+11*scale]],'#deded09b',.8);
        } else if (y > h*.29 && y < h*.73) {
          const radius = (1+Math.sin(t*1.5+i)*.45)*scale;
          P.oval(g,x,y,radius*3,radius*3,'#efd17d37');
          P.oval(g,x,y,radius,radius,'#f5d792');
        }
      });
    }

    let still;
    function tick(now) {
      frame = 0;
      if (scene === -1 && document.hidden) return;
      if (lastFrame && now-lastFrame < 32) {
        frame = requestAnimationFrame(tick);
        return;
      }
      lastFrame = now;
      if (opened === null) opened = now;
      if (journey) {
        const elapsed = Math.max(0, now - journey.started);
        const t = reduced.matches || !g ? 1 : Math.min(1, elapsed / journey.duration);
        journey.progress = t*t*(3-2*t);
        draw(900);
        if (t === 1) {
          const arrived = journey;
          station = arrived.to;
          journey = null;
          arrived.onArrival();
        } else {
          frame = requestAnimationFrame(tick);
        }
        return;
      }
      if (now-opened < 900 && !reduced.matches && (scene !== -1 || stationsOpened === null || growthPlaying)) {
        draw(now-opened);
        frame = requestAnimationFrame(tick);
        return;
      }
      if (mapArtwork && !reduced.matches) {
        const stationsAge = stationsOpened === null ? -1 : now-stationsOpened;
        const revealing = growthPlaying && stationsAge < gardenRevealTime;
        const lifeTime = stationsAge/1000;
        const active = !revealing && updateMapLife(lifeTime);
        if (revealing || !settled || active || mapLifeShown) draw(900,active ? lifeTime : undefined);
        settled = !revealing;
        frame = requestAnimationFrame(tick);
        return;
      }
      if (!settled) {
        draw(900);
        if (scene >= 1 && !reduced.matches) {
          still = document.createElement('canvas');
          still.width = canvas.width;
          still.height = canvas.height;
          still.getContext('2d').drawImage(canvas,0,0);
        }
        settled = true;
      }
      if (still) {
        g.drawImage(still,0,0,w,h);
        atmosphere(now);
        frame = requestAnimationFrame(tick);
      }
    }

    function setScene(next, progress, mapStation, animateMap) {
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(revealTimer);
      pendingReveal = null;
      growthPlaying = false;
      scene = next;
      mapLife = scene === -1 ? newMapLife() : [];
      loadArt('daiyu', true);
      [next, next + 1].forEach(function (index) {
        if (!sceneArt[index]) return;
        loadArt(sceneArt[index], false);
        loadArt(scenePartners[index], true);
      });
      tone = palettes[scene+1];
      count = progress;
      station = mapStation;
      journey = null;
      opened = null;
      stationsOpened = next === -1 && !animateMap ? performance.now() : null;
      lastFrame = 0;
      settled = false;
      still = null;
      resize();
      if (!reduced.matches && (next !== -1 || animateMap)) draw(0);
      frame = requestAnimationFrame(tick);
    }

    function walkTo(next, onArrival) {
      const distance = route[station].distance;
      journey = { from: station, to: next, onArrival: onArrival, progress: 0, started: performance.now(),
        duration: Math.max(900, Math.min(1700, distance * 5)) };
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function refreshMapMotion() {
      if (scene !== -1) return;
      settled = false;
      if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
    }

    function finishStationReveal() {
      if (!pendingReveal) return;
      clearTimeout(revealTimer);
      const reveal = pendingReveal;
      pendingReveal = null;
      stationsOpened = performance.now();
      growthPlaying = !reduced.matches && growthAssetsReady();
      reveal();
      refreshMapMotion();
    }

    function revealStations(reveal) {
      pendingReveal = reveal;
      if (reduced.matches || growthAssetsReady()) finishStationReveal();
      else revealTimer = setTimeout(finishStationReveal,260);
    }

    document.addEventListener('visibilitychange', refreshMapMotion);
    if (reduced.addEventListener) reduced.addEventListener('change', refreshMapMotion);
    else if (reduced.addListener) reduced.addListener(refreshMapMotion);

    return { setScene: setScene, resize: function () {
      still = null;
      settled = false;
      resize();
      if (!frame) frame = requestAnimationFrame(tick);
    }, positions: positions, walkTo: walkTo, stationDelay: stationDelay, revealStations: revealStations };
  }

  root.redChamberWorld = makeWorld;
}(window));
