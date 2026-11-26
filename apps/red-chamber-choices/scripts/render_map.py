"""Render the garden map plates with Blender in background mode."""
import argparse
import json
import math
from pathlib import Path
import random
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


PAPER = {
    "land": ("#8F9A65", "#C7C493"),
    "bank": ("#C7AF76", "#E8D2A3"),
    "grass": ("#4E7852", "#759764"),
    "lake": ("#467977", "#649C90"),
    "ripple": ("#80A79A", "#B9C2A3"),
    "road": ("#C6A777", "#E2C99C"),
    "sand": ("#DEC698", "#EEE0B3"),
    "stone": ("#A79B80", "#CBC0A0"),
    "shade": ("#675944", "#927958"),
    "wood": ("#563F32", "#805946"),
    "red": ("#874738", "#BB654C"),
    "trim": ("#BE9254", "#E2BC76"),
    "wall": ("#CEB48B", "#EEE0B7"),
    "jade": ("#3A5751", "#648278"),
    "tile": ("#4B6860", "#789184"),
    "ridge": ("#8D926A", "#BAB58F"),
    "amber": ("#DA9A4E", "#FFD28A"),
    "leaf": ("#3F643E", "#6F9560"),
    "bamboo": ("#52764E", "#89AA6A"),
    "bud": ("#AB6565", "#DB928A"),
    "blush": ("#D08A80", "#E9B9A4"),
    "petal": ("#DCA499", "#F1CFB5"),
}
LAYOUTS = {
    "portrait": {
        "pixels": (900, 1600), "width": 15.6,
        "stops": ((.26,.765),(.704,.610),(.307,.473),(.705,.304)),
        "controls": ((.435,.81),(.482,.596),(.59,.46)),
        "water": ((.55,-.12),(.84,-.08), (1.13,-.11),(1.16,.86),(.90,.83),(.83,.67),
                  (.81,.508),(.59,.42),(.53,.348),(.67,.275),(.62,.198),(.47,.11)),
    },
    "landscape": {
        "pixels": (1440, 900), "width": 25.6,
        "stops": ((.188,.724),(.397,.51),(.60,.683),(.802,.435)),
        "controls": ((.29,.745),(.50,.645),(.765,.72)),
        "water": ((.58,-.20),(.85,-.20),(1.2,-.18),(1.24,1.16),(.85,1.19),(.82,.93),
                  (.839,.71),(.72,.60),(.636,.51),(.60,.41),(.66,.26),(.54,.16)),
    },
}


def linear(hex_color):
    def channel(value):
        return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4
    return tuple(channel(int(hex_color[i:i+2], 16) / 255) for i in (1, 3, 5)) + (1,)


def material(name, pair):
    result = bpy.data.materials.new(name)
    result.diffuse_color = linear(pair[1])
    result.use_nodes = True
    nodes = result.node_tree.nodes
    links = result.node_tree.links
    shader = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs["Roughness"].default_value = .88
    shader.inputs["Specular IOR Level"].default_value = .19
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 7.0
    noise.inputs["Detail"].default_value = 3
    noise.inputs["Roughness"].default_value = .72
    tex = nodes.new("ShaderNodeTexCoord")
    links.new(tex.outputs["Object"], noise.inputs["Vector"])
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = .05
    ramp.color_ramp.elements[1].position = .94
    for point, color in zip(ramp.color_ramp.elements, pair):
        point.color = linear(color)
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], shader.inputs["Base Color"])
    grain = nodes.new("ShaderNodeTexNoise")
    grain.inputs["Scale"].default_value = 81
    grain.inputs["Detail"].default_value = 2.8
    links.new(tex.outputs["Object"], grain.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = .26
    bump.inputs["Distance"].default_value = .017
    links.new(grain.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    return result


class Garden:
    def __init__(self, layout):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.scene = bpy.context.scene
        self.layout = layout
        self.random = random.Random(95)
        self.mats = {name: material(name, pair) for name, pair in PAPER.items()}
        self.batch = {}
        self.layer = None
        self.layer_anchors = {}
        self.width = layout["width"]
        self.height = self.width * layout["pixels"][1] / layout["pixels"][0]
        azimuth = math.radians(21)
        pitch = math.radians(53)
        self.right = Vector((math.cos(azimuth), math.sin(azimuth), 0))
        self.far = Vector((-math.sin(azimuth), math.cos(azimuth), 0))
        self.pitch = math.sin(pitch)
        data = bpy.data.cameras.new("Orthographic map")
        data.type = 'ORTHO'
        data.ortho_scale = max(self.width, self.height)
        self.camera = bpy.data.objects.new("Orthographic map", data)
        self.scene.collection.objects.link(self.camera)
        self.camera.location = -self.far * 33 + Vector((0, 0, 33 * math.tan(pitch)))
        self.camera.rotation_euler = (-self.camera.location).to_track_quat('-Z', 'Y').to_euler()
        self.scene.camera = self.camera
        self.scene.render.resolution_x, self.scene.render.resolution_y = layout["pixels"]
        self.scene.render.resolution_percentage = 100
        bpy.context.view_layer.update()
        self.stops = [self.ground(point) for point in layout["stops"]]
        self.controls = [self.ground(point) for point in layout["controls"]]
        for original, position in zip(layout["stops"], self.stops):
            projected = world_to_camera_view(self.scene, self.camera, Vector((*position, 0)))
            assert abs(projected.x-original[0]) < .001 and abs(1-projected.y-original[1]) < .001, (original, projected)
        world = bpy.data.worlds.new("Warm paper shadows")
        self.scene.world = world
        world.use_nodes = True
        sky = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
        sky.inputs[0].default_value = (.70,.80,.94,1)
        sky.inputs[1].default_value = .30
        self.lamp("Key", (-9,-8,16), 2700, 8, (1,.84,.64))
        self.lamp("Fill", (6,1,12), 1250, 12, (.72,.85,1))
        self.scene.view_settings.view_transform = 'AgX'
        self.scene.view_settings.look = 'AgX - Medium High Contrast'

    def ground(self, point):
        u, v = point
        location = self.right*((u-.5)*self.width) + self.far*((.5-v)*self.height/self.pitch)
        return location.x, location.y

    def lamp(self, name, location, energy, size, color):
        data = bpy.data.lights.new(name, 'AREA')
        data.energy = energy
        data.shape = 'DISK'
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        self.scene.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (-obj.location).to_track_quat('-Z', 'Y').to_euler()

    def add(self, color, vertices, faces):
        verts, polys = self.batch.setdefault((self.layer, color), ([], []))
        offset = len(verts)
        verts.extend(vertices)
        polys.extend(tuple(offset + index for index in face) for face in faces)

    def prism(self, color, points, bottom, top):
        if sum(x*points[(i+1)%len(points)][1] - y*points[(i+1)%len(points)][0]
               for i,(x,y) in enumerate(points)) < 0:
            points = list(reversed(points))
        n = len(points)
        self.add(color, [(x,y,z) for z in (bottom, top) for x,y in points],
                 [tuple(reversed(range(n))), tuple(range(n,n*2))] +
                 [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])

    def box(self, color, x, y, z, width, depth, height, rotation=0):
        c, s = math.cos(rotation), math.sin(rotation)
        points = [(x+u*c-v*s,y+u*s+v*c) for u,v in
                  ((-width/2,-depth/2),(width/2,-depth/2),(width/2,depth/2),(-width/2,depth/2))]
        self.prism(color, points, z, z+height)

    def rod(self, color, a, b, radius, sides=7):
        a, b = Vector(a), Vector(b)
        axis = (b-a).normalized()
        x = axis.cross(Vector((0,1,0)) if abs(axis.y)<.92 else Vector((1,0,0))).normalized()
        y = axis.cross(x)
        rim = [radius*(x*math.cos(i*math.tau/sides)+y*math.sin(i*math.tau/sides)) for i in range(sides)]
        self.add(color, [tuple(p+v) for p in (a,b) for v in rim],
                 [tuple(reversed(range(sides))), tuple(range(sides,sides*2))] +
                 [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)])

    def disc(self, color, x, y, rx, ry, z, height, lobes=14):
        self.prism(color, [(x+rx*math.cos(i*math.tau/lobes),y+ry*math.sin(i*math.tau/lobes))
                           for i in range(lobes)], z, z+height)

    def contour(self, points):
        ring=[]
        for i, point in enumerate(points):
            before = Vector(points[i-1])
            center = Vector(point)
            after = Vector(points[(i+1)%len(points)])
            for j in range(9):
                t = j/9
                p = (before+center)/2*(1-t)**2 + center*2*t*(1-t)+(center+after)/2*t*t
                ring.append(tuple(p))
        return ring

    def terrain(self):
        self.box("land", 0, 0, -.5, 65, 70, .5)
        raw = self.contour(self.layout["water"])
        center = Vector((.94,.46))
        for name, amount, z in (("shade",1.044,.008),("bank",1.031,.015),("sand",1.012,.023),("lake",1,.032)):
            ring = [self.ground(center + (Vector(p)-center)*amount) for p in raw]
            self.prism(name, ring, -.01, z)
        self.water = raw
        for index in range(370):
            u, v = self.random.random(), self.random.random()
            if not self.inside((u,v), self.water) or not self.inside((u+.016,v), self.water):
                continue
            x, y = self.ground((u,v))
            dx = .09+self.random.random()*.32
            end = Vector((x,y,0)) + self.right*dx
            self.rod("ripple" if index%4 else "jade", (x,y,.038),(end.x,end.y,.039),.006)
            if index%9 == 0:
                for j in range(4):
                    lx = x+self.random.uniform(-.26,.26)
                    ly = y+self.random.uniform(-.27,.27)
                    self.disc("grass" if j % 2 else "bamboo",lx,ly,.115,.085,.042,.025,8)
                    if j%3==0:
                        self.flower(lx,ly,.08,.073)

    @staticmethod
    def inside(point, ring):
        x,y = point
        inside = False
        for i,(a,b) in enumerate(ring):
            c,d = ring[i-1]
            if (b > y) != (d > y) and x < (c-a)*(y-b)/(d-b)+a:
                inside = not inside
        return inside

    def road(self):
        self.road_centers=[]
        self.layer = "paths"
        for index in range(3):
            start, end, control = map(Vector, (self.stops[index],self.stops[index+1],self.controls[index]))
            centers= [(1-t)**2*start+2*(1-t)*t*control+t*t*end for t in (j/65 for j in range(66))]
            self.road_centers.extend(centers)
            for name, radius, z in (("shade",.255,.041),("road",.226,.059),("sand",.202,.071)):
                lines = [[], []]
                for k,p in enumerate(centers):
                    direction=(centers[min(k+1,65)]-centers[max(0,k-1)]).normalized()
                    normal=Vector((-direction.y,direction.x))
                    lines[0].append(tuple(p+normal*radius))
                    lines[1].append(tuple(p-normal*radius))
                self.prism(name, lines[0]+list(reversed(lines[1])),.015,z)
            for i in range(2,65,3):
                p = centers[i]
                d = (centers[i+1]-centers[i-1]).normalized()
                yaw = math.atan2(d.y,d.x)
                for side in (-1,1):
                    corner = p+side*.174*Vector((-d.y,d.x))
                    self.box("road", *corner, .071, .108,.028,.015,yaw)
            if index == 2:
                self.bridge(centers)
        for index,(x,y) in enumerate(self.stops):
            self.layer = f"foundation-{index}"
            self.layer_anchors[self.layer] = (x,y,.02)
            self.disc("shade",x,y,.46,.40,.023,.044)
            self.disc("stone",x,y,.43,.373,.064,.028)
            self.disc("sand",x,y,.395,.345,.089,.028)
        self.layer = None

    def bridge(self, centers):
        # A tiled deck on pier bents, with stone railings just outside the marked footpath.
        active = [i for i,p in enumerate(centers) if 17 <= i <= 57 and self.inside(self.project(p), self.water)]
        if not active:
            return
        near, far = max(12, min(active)-3), min(60,max(active)+3)
        for i in range(near, far):
            p, q = centers[i], centers[i+1]
            norm = (q-p).normalized()
            yaw = math.atan2(norm.y,norm.x)
            side = Vector((-norm.y,norm.x))
            z = .064 + .083*math.sin(math.pi*(i-near)/(far-near))
            self.box("stone", *(p+q)/2,z,(q-p).length+.014,.47,.046,yaw)
            for sign in (-1,1):
                a, b = p + side*(sign*.255), q + side*(sign*.255)
                self.rod("sand",(*a,z+.19),(*b,z+.192),.023,5)
                if i%4 == 0:
                    self.box("stone",*a,.023,.059,.059,z+.178,yaw)
            if i%7 == 0:
                self.box("shade",*p,.029,.11,.45,z-.023,yaw)

    def project(self, xy):
        point = Vector((*xy,0))
        return .5 + point.dot(self.right)/self.width, .5 - point.dot(self.far)*self.pitch/self.height

    def roof(self, x, y, z, width, depth, rise):
        def vertex(u, v):
            # The roof's hip and eave curves flare upwards at the corners.
            return (x+u*width/2*(.80+.20*abs(v)), y+v*depth/2,
                    z+rise*(1-abs(v))**1.65+.08*abs(v)**8+.26*abs(u)**8*abs(v)**2)
        nu,nv=25,15
        top=[vertex(2*i/nu-1,2*j/nv-1) for j in range(nv+1) for i in range(nu+1)]
        length=len(top)
        surface=[(j*(nu+1)+i,j*(nu+1)+i+1,(j+1)*(nu+1)+i+1,(j+1)*(nu+1)+i)
                 for j in range(nv) for i in range(nu)]
        sides=[]
        ring=list(range(nu+1))+[j*(nu+1)+nu for j in range(1,nv+1)]+[nv*(nu+1)+i for i in reversed(range(nu))]+[j*(nu+1) for j in reversed(range(1,nv))]
        for index,a in enumerate(ring):
            b=ring[(index+1)%len(ring)]
            sides.append((b,a,a+length,b+length))
        self.add("jade", top+[(a,b,c-.115) for a,b,c in top],
                 surface+sides+[tuple(index+length for index in face[::-1]) for face in surface])
        for i in range(nu+1):
            u=2*i/nu-1
            points=[vertex(u,2*j/nv-1) for j in range(nv+1)]
            for a,b in zip(points,points[1:]):
                lifted=lambda p: (p[0],p[1],p[2]+.018)
                self.rod("tile" if i%4 else "ridge",lifted(a),lifted(b),.016,5)
        for v in (-1,0,1):
            points=[vertex(2*i/nu-1,v) for i in range(nu+1)]
            for a,b in zip(points,points[1:]):
                self.rod("ridge",a,b,.035 if v else .052,6)
        for u in (-1,1):
            points=[vertex(u,2*j/nv-1) for j in range(nv+1)]
            for a,b in zip(points,points[1:]):
                self.rod("jade",a,b,.05,7)

    def building(self, anchor, kind, scale, station):
        ax,ay=anchor
        setback = 1.13 if kind == "pavilion" else 1.52
        x,y=ax-.05*scale,ay+setback*scale
        width,depth=3.36*scale,1.76*scale
        front=y-depth*.48
        raised=.55 if kind=="pavilion" else .27
        self.layer = f"foundation-{station}"
        for color,pad,z,height in (("shade",.47,.02,raised*.68),("stone",.37,.035+raised*.68,raised*.25),
                                   ("sand",.28,.032+raised*.93,.09)):
            self.box(color,x,y,z,width+pad,depth+pad,height)
        base=.12+raised
        for step in range(3):
            self.box("stone" if step<2 else "sand",x,front-.42+step*.115,.048,
                     width*.45,.42-step*.08,.075+step*.075)
        if kind != "pavilion":
            self.box("road",x,front-.54,.043,width*.53,.49,.041)
        self.layer = kind
        self.layer_anchors[kind] = (x, front, base)
        beam=base+1.35*scale
        for px in (-.46,0,.46) if kind=='pavilion' else (-.46,-.22,.22,.46):
            for py in (-.46,.40):
                if px==0 and py<0:
                    continue
                self.box("red",x+px*width,y+py*depth,base,.106*scale,.11*scale,beam-base)
                self.box("stone",x+px*width,y+py*depth,base-.028,.18*scale,.17*scale,.081)
            if px and kind=="pavilion":
                self.rod("wood",(x+px*width,y+depth*.4,base+.27),(x,y+depth*.4,base+.27),.035)
        for height, color, thick in ((beam-.12,"red",.12),(beam,"wood",.079),(beam+.081,"trim",.043)):
            self.box(color,x,y,height,width+.1,depth+.07,thick)
        if kind != "pavilion":
            self.box("red" if kind=="gate" else "wall",x,y+.055,base,width*.89,depth*.78,beam-base-.11)
            self.box("wood",x,front+.033,base,width*.42,.092,beam-base-.18)
            for dx in (-.105,.105):
                self.box("red",x+dx*width,front-.023,base+.045,width*.19,.045,beam-base-.26)
                for a in (-.048,0,.048):
                    for row in (.18,.31,.44,.57,.70,.83):
                        self.rod("trim",(x+(dx+a)*width,front-.05,base+row*scale),
                                 (x+(dx+a)*width,front-.071,base+row*scale),.018*scale,7)
            for px in (-.33,.33) if kind=="gate" else (-.35,.35):
                wx=x+px*width
                self.box("wood",wx,front+.015,base+.23*scale,width*.18,.13,.73*scale)
                self.box("amber" if kind=="lodge" else "wall",wx,front-.058,base+.27*scale,width*.152,.042,.65*scale)
                for u in (-.053,0,.053):
                    self.box("wood",wx+u*width,front-.09,base+.27*scale,.023,.05,.65*scale)
                for h in (.38,.54,.73,.86):
                    self.box("wood",wx,front-.091,base+h*scale,width*.15,.06,.025)
        else:
            self.disc("wood",x,y,.35,.28,base,.24)
            self.disc("trim",x,y,.49,.37,base+.25,.06)
        self.roof(x,y,beam+.125,width*1.18,depth*1.33,.59*scale)
        if kind != "lodge":
            upper=beam+.25*scale
            self.box("wall" if kind=="pavilion" else "red",x,y+.045,upper,width*.56,depth*.54,.47*scale)
            self.box("trim",x,y+.042,upper+.36*scale,width*.63,depth*.63,.09*scale)
            self.roof(x,y+.043,upper+.48*scale,width*.77,depth*.93,.44*scale)
        for side in (-1,1):
            for i in range(3):
                q=x+side*(width*.3+i*.16*scale)
                self.box("trim",q,front-.045,beam-.093,.061,.083,.088*scale)
            lx=x+side*width*.38
            self.rod("wood",(lx,front-.08,beam),(lx,front-.08,beam-.18),.016)
            self.disc("red" if kind=="gate" else "amber",lx,front-.08,.12*scale,.115*scale,beam-.39*scale,.19*scale,9)
            self.disc("trim",lx,front-.08,.086*scale,.087*scale,beam-.41*scale,.027*scale,8)
        self.layer = None

    def flower(self,x,y,z,radius):
        for i in range(5):
            a=math.tau*i/5
            self.disc(("petal","blush","bud")[i%3],x+math.cos(a)*radius*.63,y+math.sin(a)*radius*.63,
                      radius*.60,radius*.44,z+i*.002,.023,7)
        self.disc("trim",x,y,radius*.27,radius*.27,z+.027,.014,7)

    def tree(self, x,y, size, kind):
        r=self.random
        if kind=="bamboo":
            for i in range(6):
                a=x+r.uniform(-.20,.20)*size
                b=y+r.uniform(-.19,.19)*size
                height=r.uniform(.60,1.52)*size
                dx=r.uniform(-.20,.20)*size
                self.rod("leaf",(a,b,.022),(a+dx,b+.11*size,height),.022*size)
                for j in range(4):
                    z=height*(j*.16+.45)
                    d=(-1 if j%2 else 1)*r.uniform(.18,.38)*size
                    u=a+dx*z/height
                    v=b+.11*size*z/height
                    self.rod("bamboo",(u,v,z),(u+d,v+.04*size,z+.1*size),.012*size)
                    self.add("grass" if j%2 else "bamboo",
                             [(u,v,z),(u+d*.43,v-.075*size,z+.104*size),(u+d,v+.02*size,z+.11*size),
                              (u+d*.62,v+.065*size,z+.045*size)],[(0,1,2,3)])
            return
        height=r.uniform(.85,1.12)*size
        self.rod("wood",(x,y,.02),(x+.09*size,y,height*.75),.053*size)
        palette=("bud","blush","petal") if kind=="peach" else ("leaf","grass","bamboo")
        for i,(dx,dy,dz) in enumerate(((-.27,-.14,.02),(.24,-.15,.09),(-.17,.23,.10),(.26,.25,.03),(.02,.04,.26))):
            tx,ty,tz=x+dx*size,y+dy*size,height+dz*size
            self.rod("wood",(x+.06*size,y,height*.47),(tx,ty,tz-.11*size),.026*size)
            for row in range(3):
                radii=(.31-row*.058)*size
                self.disc(palette[row],tx-.02*row*size,ty+.023*row*size,
                          radii,radii*.85,tz+row*.072*size,.095*size,11)
            for j in range(8):
                angle=r.random()*math.tau
                d=math.sqrt(r.random())*.205*size
                a,b=tx+math.cos(angle)*d,ty+math.sin(angle)*d
                if kind=="peach":
                    self.flower(a,b,tz+.198*size,.044*size)
                else:
                    self.disc(palette[(j+1)%3],a,b,.054*size,.033*size,tz+.198*size,.023*size,7)

    def planted(self):
        r=self.random
        # The paths and forecourts remain clear, so the interactive figure stays visible.
        boxes=[Vector((x,y+1.05)) for x,y in self.stops]
        for i in range(295):
            u,v=r.uniform(.01,.99),r.uniform(.10,.96)
            if self.inside((u,v),self.water):
                continue
            p=Vector(self.ground((u,v)))
            if any((p-q).length<.62 for q in self.road_centers) or any((p-q).length<1.53 for q in boxes):
                continue
            x,y=p
            if i%3==0 and (v>.18 or u<.31 or u>.73):
                self.tree(x,y,r.uniform(.32,.90),("peach","bamboo","pine","pine")[i%4])
            else:
                color=("grass","leaf","bank","stone")[i%4]
                radius=r.uniform(.08,.28)
                self.disc(color,x,y,radius,radius*.68,.005,.05+r.random()*.09,8)
                if i%5==0:
                    self.flower(x,y,.19,.065)
        for idx in (0,2,3):
            x,y=self.stops[idx]
            s=(1.05,0,.89,.86)[idx]
            self.building((x,y),("gate","","lodge","pavilion")[idx],s,idx)
            for side in (-1,1):
                for i in range(5):
                    self.tree(x+side*(1.54+r.uniform(0,.58))*s,y+r.uniform(.68,2.22)*s,
                              r.uniform(.41,.62), "bamboo" if idx!=0 else "pine")
        x,y=self.stops[1]
        y+=.79
        self.layer = "foundation-1"
        for row in range(5):
            radius=1.07-row*.15
            self.disc(("shade","stone","bank","land","blush")[row],x,y,radius,radius*.64,.025+row*.073,.087,20)
        for side in (-1,1):
            self.layer = "peach-west" if side < 0 else "peach-east"
            self.layer_anchors[self.layer] = (x+side*.82,y+.47,.02)
            self.tree(x+side*.82,y+.47,1.2 if side>0 else .88,"peach")
        self.layer = "foundation-1"
        for i in range(38):
            a=r.random()*math.tau
            radius=r.uniform(.22,.82)
            self.flower(x+math.cos(a)*radius,y+math.sin(a)*radius*.59,
                        .33 if radius<.48 else .24,r.uniform(.025,.061))
        self.layer = None

    def garden_beds(self):
        # Low overlapping reliefs add large shapes around the fine foliage.
        portrait = self.height > self.width
        beds = (
            ((.08,.27),(.145,.59),(.58,.85),(.41,.145)) if portrait else
            ((.14,.265),(.38,.26),(.095,.53),(.48,.835),(.72,.80))
        )
        r = self.random
        for index, center in enumerate(beds):
            x,y = self.ground(center)
            radius=(1.35 if portrait else 1.74)*r.uniform(.84,1.16)
            for tier in range(3):
                width=radius*(1-tier*.14)
                points=[]
                for i in range(22):
                    a=i*math.tau/22
                    ripple=1+math.sin(a*3+index)*.10+math.cos(a*5)*.07
                    points.append((x+math.cos(a)*width*ripple,y+math.sin(a)*width*.62*ripple))
                self.prism(("bank","land","grass")[tier],points,.006+tier*.032,.035+tier*.032)
            for i in range(13):
                a=i*math.tau/13+index
                offset=radius*r.uniform(.43,.75)
                tx,ty=x+math.cos(a)*offset,y+math.sin(a)*offset*.62
                if i%4==0:
                    self.tree(tx,ty,r.uniform(.57,.94),("pine","bamboo","peach")[index%3])
                else:
                    self.disc(("leaf","bamboo","land")[i%3],tx,ty,.12+r.random()*.14,.13,.10,.075,9)
                    if i%2: self.flower(tx,ty,.187,.056)

    def render(self, output, layers=False):
        self.terrain()
        self.road()
        self.planted()
        self.garden_beds()
        objects = []
        layer_points = {name: [] for name in self.layer_anchors}
        for (layer,color),(vertices,faces) in self.batch.items():
            name = f"{layer}-{color}" if layer else color
            mesh=bpy.data.meshes.new(name)
            mesh.from_pydata(vertices,[],faces)
            mesh.materials.append(self.mats[color])
            obj=bpy.data.objects.new(name,mesh)
            self.scene.collection.objects.link(obj)
            objects.append((layer,obj))
            if layer in layer_points:
                layer_points[layer].extend(self.plate_pixel(vertex) for vertex in vertices)
        self.scene.render.engine='CYCLES'
        self.scene.cycles.samples=20
        self.scene.cycles.use_denoising=True
        self.scene.render.image_settings.file_format='PNG'
        if not layers:
            self.write_render(output)
            return

        for layer,obj in objects:
            obj.hide_render = layer is not None
        self.scene.render.resolution_percentage = 80
        self.write_render(output.with_name(output.stem + "-ground.png"))

        self.scene.render.resolution_percentage = 100
        self.scene.render.film_transparent = True
        self.scene.render.image_settings.color_mode = 'RGBA'
        passes = {
            "foundations": {f"foundation-{index}" for index in range(4)},
            "paths": {"paths"},
            "pieces": {"gate", "lodge", "pavilion", "peach-west", "peach-east"},
        }
        for name,visible in passes.items():
            self.scene.cycles.samples = 20 if name == "pieces" else 12
            for layer,obj in objects:
                obj.hide_render = layer not in visible
            self.write_render(output.with_name(output.stem + f"-{name}.png"))

        metadata = {}
        for name,points in layer_points.items():
            xs, ys = zip(*points)
            metadata[name] = {
                "bounds": [math.floor(min(xs))-3, math.floor(min(ys))-3,
                           math.ceil(max(xs))+3, math.ceil(max(ys))+3],
                "anchor": [round(value, 2) for value in self.plate_pixel(self.layer_anchors[name])],
            }
        output.with_suffix(".json").write_text(json.dumps(metadata, indent=2) + "\n")

    def plate_pixel(self, point):
        uv = world_to_camera_view(self.scene, self.camera, Vector(point))
        width,height = self.layout["pixels"]
        return uv.x*width, (1-uv.y)*height

    def write_render(self, output):
        self.scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)


def main():
    args = argparse.ArgumentParser()
    args.add_argument("layout", choices=LAYOUTS)
    args.add_argument("output", type=Path)
    args.add_argument("--layers", action="store_true", help="render the terrain, landmarks, foundations, and paths separately")
    options = args.parse_args(sys.argv[sys.argv.index("--")+1:])
    Garden(LAYOUTS[options.layout]).render(options.output, options.layers)


if __name__ == "__main__":
    main()
