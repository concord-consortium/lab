; Climate Model with an Ocean
; June 13, 2010

; This climate model includes ocean absorbtion of CO2. 
; The probability of ocean absorbtion depends on temperature
; CO2 enters the atmosphere from land and factories at a constant rate. 
; It also comes from the release from oceans which is temperature-dependent.
; CO2 is absorbed on land and deposited (eliminated) in oceans. 

breed [ factories ]
breed [ clouds ]
breed [ sunray ]
breed [ IR ]
breed [ heat ]
breed [ air-CO2 ]    ;; CO2 in the air
breed [ ocean-CO2 ]  ;; CO2 in the ocean

clouds-own [ cloud-num ]

globals [
    done
    sky-top             ;; the top of the sky, in pixels
    earth-top           ;; the top of the earth, in pixels
    earth-edge          ;; the rightmost edge of the earth, in pixels
    temperature 
    num-clouds  
    sun-brightness
    date 
    steps-per-year      
    A-var               ;; needed to get in and out of environments(?) There may be a better way--look at add-air-CO2
    air-CO2-amount 
    ocean-CO2-amount
    ray-size            ;; the size of the sunray, IR, and heat icons
    ppm                 ;; the CO2 concentration in parts per million
    step-number         ;; my own ticker
    absorp              ;; the adjusted CO2 absorbtion
    CO2-level-air
    heat-level
    CO2-level-ocean
    ]

;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; Initialize ;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;

to startup  ;; executed once when the program opens. 
  ;; (for this model to work with NetLogo's new plotting features,
  ;; __clear-all-and-reset-ticks should be replaced with clear-all at
  ;; the beginning of your setup procedure and reset-ticks at the end
  ;; of the procedure.)
  __clear-all-and-reset-ticks
  set done true
  set steps-per-year 300           ;; this determines how slowly time passes
  set sky-top (max-pycor - 2)
  set earth-top 1
  set air-CO2-amount 110           ;; set the initial amount of CO2 in the air
  set ocean-CO2-amount 40          ;;  set the initial amount of CO2 in the oceans
  set temperature 17               ;; starting temperature
  set sun-brightness 1.8           ;; determines insolation
  set date 2005 
  set earth-edge min-pxcor / 3     ;; sets earth to cover 1/3 of the screen
  set ray-size 1.5
  set ppm 360                      ;; starting CO2 concentration
  setup-world
end

to setup-world          ;; draw the scene
  set step-number 0     ;; resert step counter
  ask patches [                          
     if (pycor = max-pycor) [ set pcolor black ] ;; black in outer space
     if (pycor < max-pycor) and (pycor > sky-top) [
        set pcolor 9 - scale-color white pycor sky-top max-pycor   ]
     if ((pycor <= sky-top) and (pycor >= earth-top)) [
        set pcolor blue + 2 * (pycor + max-pycor) / max-pycor  ]
     if (pycor < earth-top) 
        [ ifelse pxcor > earth-edge ;; put land on the left, oceans on the right
          [ set pcolor 100 + 5 * ( pycor - min-pycor) / (earth-top - min-pycor) ]  ;; fade from 105 to 100 with depth, from earth-top to min-pycor  
          [ set pcolor red + 3 ]  ;; land 
        ]]
  update-albedo 
  setup-clouds 1                  ;; add one cloud
  add-factories 2                 ;; show some factories on land
  setup-air-CO2 air-CO2-amount      ;; start off with some CO2 in the air
  setup-ocean-CO2 ocean-CO2-amount  ;; start off with some CO2 in the oceans
  create-heat 600 [               ;; make some heat objects
     set ycor  random-between (earth-top - 1) min-pycor 
     set xcor random (2 * max-pxcor )
     set size ray-size
     set shape "heat"  ]
end    

to setup-clouds [ n ] 
  ask clouds [ die ]  ;; kill off all clouds because different clouds move at 
  let i 0             ;;   different heights 
  repeat n            ;; make n clouds
     [ make-cloud  i n
     set i i + 1]
end

to setup-ocean-CO2 [ n ]  ;;  places some CO2 in the oceans 
  repeat n [
    create-ocean-CO2 1 [
      set heading random 360
      set shape "CO2"
      set size ray-size
      setxy (random-between (earth-edge + 1) max-pxcor) (random-between min-pycor (earth-top - 1))
    ]]
end

to setup-air-CO2 [ n ]
    repeat n [
    create-air-CO2 1 [
      set heading random 360
      set shape "CO2"
      set size ray-size
      setxy (random-between min-pxcor max-pxcor) (random-between earth-top sky-top )
    ]]
end

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;; Execution Routines ;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to execute 
  set step-number step-number + 1
  ask clouds [ fd .3 * (0.1 + (3 + cloud-num) / 10) ]  ; move clouds along
  run-sunshine 
  run-heat  ;; moves heat dots
  run-IR    ;; moves the IR arrowheads
  run-air-CO2   ;; move CO2 molecules in the atmosphere
  run-ocean-CO2  ;; move the CO2 in the oceans
  set date date + 1 / steps-per-year  ;; advance the date.
  set temperature .99 * temperature + .01 * (-70 + .15 * count heat) ;; the temperature is related to the number of heat turtles
  set ppm .99 * ppm + .035 * count air-CO2
  if (step-number mod 20 = 0) [     ;; do these updates every 20 steps
    update-outputs
    update-albedo 
    ask factories [set color 9.9 * (1 - (CO2-emission  / 200 ))]  ;; goes from white to black
    ifelse show-heat [ask heat [st] ] [ask heat [ht]]  ;; hide or show heat 
    ifelse show-CO2 [ask air-CO2 [st] ask ocean-CO2 [st]] [ask air-CO2 [ht] ask ocean-CO2 [ht]]
    add-air-CO2 CO2-emission / 40 ]  ;; add some CO2 from the factories
  tick
end

to update-outputs
  set CO2-level-air ppm
  set heat-level count heat
  set CO2-level-ocean count ocean-CO2
end

to update-albedo  
  ask patches [ 
    if (pycor = earth-top and pxcor <= earth-edge) 
      [ set pcolor 59 - 9 * albedo ]  ;; show albedo color on land
  ]
end    



;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;  cloud routines ;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;   

to add-cloud            ;; erase clouds and then create new ones
  set num-clouds num-clouds + 1
  setup-clouds num-clouds
end

to remove-cloud
  if (num-clouds > 0 ) [
      set num-clouds num-clouds - 1
      setup-clouds num-clouds ]
end

to make-cloud [ k n ]                   ;; makes cloud number k out of n total
  let width sky-top - earth-top
  let mid ( sky-top + earth-top ) / 2
  let y mid + width * ((k / n) - 0.3 ) - 2  ;; the ratio k/n determines its altitude
  if k = 0 [set y 6 ]
  let x 2 * (random max-pxcor ) + min-pxcor
  repeat 3 + random 20 [ create-clouds 1 [ ;; lots of turtles make up a cloud
    set cloud-num k
    setxy x + (random 9) - 4 y + random random 5
    set color white
    set size 2 + random 2
    set heading 90 
    Set shape "cloud" ]  ]
end

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;; sunray routines ;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to run-sunshine
  ask sunray [
     fd .4    ;; move sunrays forward
     if ((heading = 20) and (ycor = max-pycor)) [ die ] ] ;; kill rays leaving upward
  create-sunshine  ;; start new sun rays from top
  reflect-sunrays-from-clouds  ;; check for reflection off clouds
  encounter-earth   ;; check for reflection off earth and absorbtion (depends on albedo)
  encounter-ocean   ;; check for absorbtion into the ocean (100% is absorbed) 
 end

to create-sunshine
  if 15 * sun-brightness > random 50
    [ create-sunray 1 
      [ set heading 160
      set color yellow
      set size ray-size
      setxy random (2 * max-pxcor)  max-pycor ] ]  ;; sunray comes in at random from top of atmosphere
end
 
to reflect-sunrays-from-clouds
 ask sunray [
    if (count clouds-here > 0 ) [   ;; if sunray shares patch with a cloud
      set heading 180 - heading ]]  ;; reflect
end 

to encounter-earth
  ask sunray [
    if (ycor <= earth-top and xcor <= earth-edge) [
      ifelse (100 * albedo < random 100) 
          [ set heading 20  ]           ;; reflect
          [ set heading random-between 95 265 ;; morph into heat energy
            set breed heat    
            set shape "heat"  ]]]
end

to encounter-ocean
    ask sunray [
    if (ycor < earth-top and xcor > earth-edge) 
          [ set heading random-between 95 265 ;; morph into heat energy
            set breed heat    
            set shape "heat"  ]]
end

to run-heat    ;; advances the heat energy turtles
  ask heat [
    fd .5 * ( random 11 ) / 10
    if (ycor <= min-pycor ) [ set heading random-between -60 60 ] ;; if heading into the earth's core, bounce
    if (ycor >= earth-top ) [  ;; if heading back into atmosphere
      ifelse (temperature > random-between 0 50)   ;; select more if it is hot
        [ set breed IR
        set heading 20
        set color magenta 
        set shape "default" ;; let them escape as IR
        st ]                ;; show turtle in case the heat turtles are being hidden
        [ set heading random-between 100 260 ]]] ;; return them to earth
end 

to run-IR
  ask IR [
    fd .3
    if (ycor >= max-pycor ) [ die ]
    if (ycor <= earth-top ) [   ;; convert to heat 
      set breed heat
      set heading random-between 95 265
      set shape "heat" ]
    if (count air-CO2-here > 0)   ;; check for collision with CO2
      [ set heading 180 - heading ]]
end

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;; CO2 Routines ;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to add-air-CO2 [n] ;; randomly adds CO2 molecules to atmosphere from factories
  repeat round n [
    create-air-CO2 1 [
      set shape "CO2"
      set size ray-Size
      set heading random-between -60 90
      ifelse (count factories > 0 ) 
        [ask one-of factories [set A-var xcor ]] 
        [set A-var random (2 * max-pxcor) + min-pxcor ]
      setxy A-var earth-top + 4 ]]
end

to run-air-CO2 ;; moves CO2 molecules in the atmosphere and handles absorbtion
  ask air-CO2 [
    set heading heading + random-between -5 5                   ;; turn a bit
    fd .03 * random-between 5 15                                ;; move forward a bit
    if (ycor <= earth-top + 1 and xcor <= earth-edge)           ;; if it collides with the earth
      [ifelse (random 4 = 1 )                                   ;; 25% the time     
        [ die ]                                                 ;; absorb the CO2 into the earth 
        [set heading random-between -60 60 ]]                   ;; otherwise bounce it upward
    if (ycor >= sky-top) [set heading random-between 110 250 ]  ;; bounce off sky top
    if (ycor < earth-top  and xcor > earth-edge)                ;; if it collides with the ocean  
      [set absorp ocean-absorption -                            ;; compute temperature-controlled ocean absorption
        ((temperature - 10) * temperature-impact / 2)              ;; decrease the absorption by a percent of the impact slider
        if (absorp < 10) [set absorp 10 ]                       ;; put a lower limit on ocean absorption
      ifelse (absorp > random 100 )                             ;; a fraction of the CO2 will enter the water
        [set breed ocean-CO2                                    ;;      depending on the ocean-absorption slider
           set shape "CO2" ]                                    ;; morph into a ocean-CO2
        [ set heading random-between -70 70]                    ;; otherwise bounce back into the air
      ]]
end

to run-ocean-CO2 ;; updates the number of CO2 molecules in the ocean and moves them
    ask ocean-CO2 [
      ifelse ycor < min-pycor + 5                         ;; if it is deep
         [set heading 180 fd .05 ]                        ;; send it straight down slowly
         [set heading heading + random-between -30 30     ;; otherwise turn a bit
              fd .01 * random-between 5 15 ]              ;; and move forward a bit
      if ycor <= min-pycor [die]                          ;; if it reaches the bottom, it dies
      if (pycor >= earth-top and pxcor > earth-edge)      ;; if it collides with the surface
         [ifelse (random 4 = 1 )                          ;; 25% of the time escape into the air
            [ set breed air-CO2
            set shape "CO2" ]                  ;; morph into air-CO2
        [set heading random-between 100 250 ] ]           ;; the other half bounce down
      if pxcor <= min-pxcor / 2 [set heading random-between 200 340 ] ;; if it is near the left edge, go left
      if (pxcor <= earth-edge and pxcor > min-pxcor / 2)
         [set heading random-between 45 125 ]             ;; if it strays left into the earth, turn it around
    ]
end

to add-factories [ n ]
  let i round n  ;; n is real and can be negative or zero, i is the nearest integer
  if (i > 0) [
    repeat i [
      create-factories 1 [
        let bumper 4 ;; the bumper keeps factories from falling off either edge of land
        let a earth-edge - bumper
        let b min-pxcor + bumper
        setxy b + random (a - b ) earth-top + 2 
        set color 9.9 * (1 - (CO2-emission  / 200 ))
        set shape "factory" 
        set size 4]]]
  if (i < 0) [ ;; remove factories
      let j (0 - i) ;; j is the number of factories to be removed
      let facts count factories ;; facts is the number of factories on screen
      if (j > facts) [ set j facts ] ;; cannot remove more factories than are on screen
      ask n-of j factories [ die ]] ;; remove j factories from screen
end

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; handy math ;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to-report random-between [a b]  ;;  returns a random number between a and b. 
  ifelse (a < b)  ;; returns a two-decimal number that can include a or b and any .01 value between
    [report  a + .01 * random (1 + 100 * (b - a)) ]
    [report  b + .01 * random (1 + 100 * (a - b)) ]
end













@#$#@#$#@
GRAPHICS-WINDOW
21
140
905
601
29
14
14.83
1
10
1
1
1
0
1
1
1
-29
29
-14
14
0
0
1
ticks
30.0

BUTTON
21
18
130
51
Add Cloud
add-cloud
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

BUTTON
21
52
131
85
Remove Cloud
remove-cloud
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

SLIDER
414
51
639
84
CO2-emission
CO2-emission
0
200
100
1
1
%
HORIZONTAL

MONITOR
193
18
286
63
NIL
Temperature
1
1
11

MONITOR
135
18
192
63
NIL
Date
0
1
11

SLIDER
645
17
870
50
Ocean-Absorption
Ocean-Absorption
0
100
34
1
1
%
HORIZONTAL

SLIDER
645
49
870
82
Temperature-Impact
Temperature-Impact
0
10
0
1
1
% per degree
HORIZONTAL

SLIDER
413
17
638
50
Albedo
Albedo
0
1
0.64
.01
1
NIL
HORIZONTAL

BUTTON
290
17
404
50
Watch Sunray
watch one-of sunray with [ycor > (max-pycor / 2 ) and heading > 90 ]
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

BUTTON
290
51
404
84
Watch CO2
watch one-of air-CO2 
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

SWITCH
503
97
626
130
Show-heat
Show-heat
1
1
-1000

SWITCH
634
97
758
130
Show-CO2
Show-CO2
1
1
-1000

MONITOR
26
90
127
135
CO2 level (air)
CO2-level-air
17
1
11

MONITOR
345
92
440
137
Heat energy
heat-level
17
1
11

MONITOR
135
91
243
136
CO2 level (ocean)
CO2-level-ocean
17
1
11

MONITOR
251
91
337
136
absorp
absorp
17
1
11

@#$#@#$#@
## WHAT IS IT?

This is a model of the response of global climate to population growth and to efforts to reduce greenhouse gasses. It is built on a model of energy flow from the sun and radiation of infrared light. That model--Climate Change--should be run before this one.

In this model, people and factories are shown. The factories represent all the greenhouse gas emitters, including cars and home heating. CO2 is emitted at a rate that depends on the population because the population sets the nuber of factories. CO2 stands for all the different kinds of greenhouse gasses that can block the infrared light that carries heat energy from the earth to space.

## HOW IT WORKS

Yellow arrowheads stream downward representing sunlight energy. Some of the sunlight reflects off clouds and more can reflect off the earth surface. If sunlight is absorbed it turns into a red dot, representing heat energy. Each dot represents the energy of one yellow sunlight arrowhead. The red dots randomly move around the earth. The temperature of the earth is related to the total number of red dots. 

Sometimes the red dots transform into infrared (IR) light that heads toward space, carrying off energy. The probability of a red dot becoming IR light depends on the earth temperature. When the earth is cold, few red dots cause IR light; when it is hot, most do. The IR energy is represented by a magenta arrowhead. Each carries the same energy as a yellow arrowhead and as a red dot. The IR light goes through clouds but can bounce off CO2 molecules. 

The number of CO2 molecules depends on the earth's population. The more people there are, the more CO2 is generated. CO2 is usually absorbed by the earth (or oceans), so there is a balance between the emission and absorbtion of CO2. Since CO2 blocks infrard, the earth warms if there is a lot of CO2 in the atmosphere.

## HOW TO USE IT

The "Setup" button sets the model to a reasonable approximation of the situation in the year 2000. The "Run/Pause" runs the model or stops the run. 

The "pop-growth-rate" slider controls how quickly the global population increases as a percentage of the current population per year. This can be adjusted from 20% to �20%. A 20% growth rate means that a population of 1,000 would become 1,200 after a year.  The negative values represent a drop in population which can happen if deaths outnumber births.  

People are shown to representate the global population. Each person stands for 100 million people. Their clothes and speed are random and have no impact on the model. 

The "CO2-Emission" slider controls the amount of CO2 each person generates. The scale is a percentage of its starting value in the year 2000. As the average living standard goes up, this value will increase also. Other factors that would increase it are more gas-guzzling cars, less effecient factories, and buring tropical forests. 

The factories represent the production of CO2 and stand for cars, home heating, and all other man-made sources of CO2. Their color indicates how much CO2 is produced per person. The factories get more black if you increase the "CO2-Emission" slider. 

You can add and remove clouds with buttons. Clouds block sunlight but not IR. As the world heats up, there might be more clouds. This is not built into the model, but you can make it happen by using the "Add Cloud" button. 

The temperature of the earth is related to the amount of heat in the earth. The more red dots you see, the hotter it is. These can escape as infrared light, but this can be bounced back by CO2 molecules. This is the greenhouse effect. 

## THINGS TO NOTICE

What happens to an infrared arrowhead when it hits a CO2 molecule? 

Follow a CO2 molecule from its birth in the smoke from a smokestack to its absorbtion by the earth. Describe its travels. Repeat several times. 

Let the model run with its starting values for a while. Why does the temperature change? Can you tell the difference between random variations and a heating or cooling trend? How long do you have to wait to be sure whether you are seeing a trend or random changes? 

## THINGS TO TRY

1. Explore the effect of population. First, let the model run with 0% population growth and 100% "CO2-Emission". Then increase the population as quickly as possible to 12 billion. This is the level that experts hope is the maximum this century. It could be much larger, but if poor women are educated worldwide and birth control becomes commonplace, the population could peak at this level. What does the model predict for global temperature with this population? 

2. Explore the effect of "CO2-Emission". Right now, emissions are increasing, as developing countries like India and China increase their standards of living while rich countries increase consumption. With 0% population growth, start CO2-Emission at 100% for twenty years, then increase it to 200% for 20 years and then drop it to 0% for another 20 years. What do you see? 

3. Try to make a more reasonable model. Start with a population growth rate of 3% per year and then decrease it slowly so that the population tops out at 12 billion and then begins dropping. What happens to the global temperature? Imagine that CO2 emissions are reduced through conservation and new technologies. This might result in a decrease in "CO2-Emission." It is up to you to decide how much, but realize that even a small reduction could require a huge sacrifice in convenience and major expenses for new technologies. 

## MODEL LIMITATIONS

This model is a huge simplification. Professional scientists using huge computers cannot be sure their projections are accurate, so this greatly simplified model will be even more inaccurate. The point of this model is not to be predictive, its main goal is to show some of the causes of global climate change. 

The general responses of the model are approximately correct, even if its numerical predictions are not. It shows how population can effect climate though greenhouse gas emission. It shows how energy effeciency can reduce the impact of the greenhouse effect. 

## CREDITS AND REFERENCES

Created in Nov. 2005 by Robert Tinker for the TELS project. Updated Jan 9, 2006
@#$#@#$#@
default
true
0
Polygon -7500403 true true 150 5 40 250 150 205 260 250

airplane
true
0
Polygon -7500403 true true 150 0 135 15 120 60 120 105 15 165 15 195 120 180 135 240 105 270 120 285 150 270 180 285 210 270 165 240 180 180 285 195 285 165 180 105 180 60 165 15

arrow
true
0
Polygon -7500403 true true 150 0 0 150 105 150 105 293 195 293 195 150 300 150

box
false
0
Polygon -7500403 true true 150 285 285 225 285 75 150 135
Polygon -7500403 true true 150 135 15 75 150 15 285 75
Polygon -7500403 true true 15 75 15 225 150 285 150 135
Line -16777216 false 150 285 150 135
Line -16777216 false 150 135 15 75
Line -16777216 false 150 135 285 75

bug
true
0
Circle -7500403 true true 96 182 108
Circle -7500403 true true 110 127 80
Circle -7500403 true true 110 75 80
Line -7500403 true 150 100 80 30
Line -7500403 true 150 100 220 30

butterfly
true
0
Polygon -7500403 true true 150 165 209 199 225 225 225 255 195 270 165 255 150 240
Polygon -7500403 true true 150 165 89 198 75 225 75 255 105 270 135 255 150 240
Polygon -7500403 true true 139 148 100 105 55 90 25 90 10 105 10 135 25 180 40 195 85 194 139 163
Polygon -7500403 true true 162 150 200 105 245 90 275 90 290 105 290 135 275 180 260 195 215 195 162 165
Polygon -16777216 true false 150 255 135 225 120 150 135 120 150 105 165 120 180 150 165 225
Circle -16777216 true false 135 90 30
Line -16777216 false 150 105 195 60
Line -16777216 false 150 105 105 60

car
false
0
Polygon -7500403 true true 300 180 279 164 261 144 240 135 226 132 213 106 203 84 185 63 159 50 135 50 75 60 0 150 0 165 0 225 300 225 300 180
Circle -16777216 true false 180 180 90
Circle -16777216 true false 30 180 90
Polygon -16777216 true false 162 80 132 78 134 135 209 135 194 105 189 96 180 89
Circle -7500403 true true 47 195 58
Circle -7500403 true true 195 195 58

car side
false
0
Polygon -7500403 true true 19 147 11 125 16 105 63 105 99 79 155 79 180 105 243 111 266 129 253 149
Circle -16777216 true false 43 123 42
Circle -16777216 true false 194 124 42
Polygon -16777216 true false 101 87 73 108 171 108 151 87
Line -8630108 false 121 82 120 108
Polygon -1 true false 242 121 248 128 266 129 247 115
Rectangle -16777216 true false 12 131 28 143

circle
false
0
Circle -7500403 true true 0 0 300

circle 2
false
0
Circle -7500403 true true 0 0 300
Circle -16777216 true false 30 30 240

cloud
false
0
Circle -7500403 true true 13 118 94
Circle -7500403 true true 86 101 127
Circle -7500403 true true 51 51 108
Circle -7500403 true true 118 43 95
Circle -7500403 true true 158 68 134

co2
true
0
Circle -16777216 true false 83 83 134
Circle -16777216 true false 21 96 108
Circle -16777216 true false 171 96 108
Circle -1 true false 30 105 90
Circle -1 true false 180 105 90
Circle -10899396 true false 90 90 120

cow
false
0
Polygon -7500403 true true 200 193 197 249 179 249 177 196 166 187 140 189 93 191 78 179 72 211 49 209 48 181 37 149 25 120 25 89 45 72 103 84 179 75 198 76 252 64 272 81 293 103 285 121 255 121 242 118 224 167
Polygon -7500403 true true 73 210 86 251 62 249 48 208
Polygon -7500403 true true 25 114 16 195 9 204 23 213 25 200 39 123

cylinder
false
0
Circle -7500403 true true 0 0 300

dot
false
0
Circle -7500403 true true 90 90 120

face happy
false
0
Circle -7500403 true true 8 8 285
Circle -16777216 true false 60 75 60
Circle -16777216 true false 180 75 60
Polygon -16777216 true false 150 255 90 239 62 213 47 191 67 179 90 203 109 218 150 225 192 218 210 203 227 181 251 194 236 217 212 240

face neutral
false
0
Circle -7500403 true true 8 7 285
Circle -16777216 true false 60 75 60
Circle -16777216 true false 180 75 60
Rectangle -16777216 true false 60 195 240 225

face sad
false
0
Circle -7500403 true true 8 8 285
Circle -16777216 true false 60 75 60
Circle -16777216 true false 180 75 60
Polygon -16777216 true false 150 168 90 184 62 210 47 232 67 244 90 220 109 205 150 198 192 205 210 220 227 242 251 229 236 206 212 183

factory
false
0
Rectangle -7500403 true true 76 194 285 270
Rectangle -7500403 true true 36 95 59 231
Rectangle -16777216 true false 90 210 270 240
Line -7500403 true 90 195 90 255
Line -7500403 true 120 195 120 255
Line -7500403 true 150 195 150 240
Line -7500403 true 180 195 180 255
Line -7500403 true 210 210 210 240
Line -7500403 true 240 210 240 240
Line -7500403 true 90 225 270 225
Circle -1 true false 37 73 32
Circle -1 true false 55 38 54
Circle -1 true false 96 21 42
Circle -1 true false 105 40 32
Circle -1 true false 129 19 42
Rectangle -7500403 true true 14 228 78 270

fish
false
0
Polygon -1 true false 44 131 21 87 15 86 0 120 15 150 0 180 13 214 20 212 45 166
Polygon -1 true false 135 195 119 235 95 218 76 210 46 204 60 165
Polygon -1 true false 75 45 83 77 71 103 86 114 166 78 135 60
Polygon -7500403 true true 30 136 151 77 226 81 280 119 292 146 292 160 287 170 270 195 195 210 151 212 30 166
Circle -16777216 true false 215 106 30

flag
false
0
Rectangle -7500403 true true 60 15 75 300
Polygon -7500403 true true 90 150 270 90 90 30
Line -7500403 true 75 135 90 135
Line -7500403 true 75 45 90 45

flower
false
0
Polygon -10899396 true false 135 120 165 165 180 210 180 240 150 300 165 300 195 240 195 195 165 135
Circle -7500403 true true 85 132 38
Circle -7500403 true true 130 147 38
Circle -7500403 true true 192 85 38
Circle -7500403 true true 85 40 38
Circle -7500403 true true 177 40 38
Circle -7500403 true true 177 132 38
Circle -7500403 true true 70 85 38
Circle -7500403 true true 130 25 38
Circle -7500403 true true 96 51 108
Circle -16777216 true false 113 68 74
Polygon -10899396 true false 189 233 219 188 249 173 279 188 234 218
Polygon -10899396 true false 180 255 150 210 105 210 75 240 135 240

heat
true
0
Polygon -2674135 true false 150 0 120 30 120 60 150 90 180 105 180 135 150 150 120 180 120 210 150 240 180 255 150 300 195 285 210 240 180 225 150 195 165 180 195 150 210 135 210 90 180 75 165 60 150 30

house
false
0
Rectangle -7500403 true true 45 120 255 285
Rectangle -16777216 true false 120 210 180 285
Polygon -7500403 true true 15 120 150 15 285 120
Line -16777216 false 30 120 270 120

leaf
false
0
Polygon -7500403 true true 150 210 135 195 120 210 60 210 30 195 60 180 60 165 15 135 30 120 15 105 40 104 45 90 60 90 90 105 105 120 120 120 105 60 120 60 135 30 150 15 165 30 180 60 195 60 180 120 195 120 210 105 240 90 255 90 263 104 285 105 270 120 285 135 240 165 240 180 270 195 240 210 180 210 165 195
Polygon -7500403 true true 135 195 135 240 120 255 105 255 105 285 135 285 165 240 165 195

line
true
0
Line -7500403 true 150 0 150 300

line half
true
0
Line -7500403 true 150 0 150 150

molecule water
true
0
Circle -1 true false 183 63 84
Circle -16777216 false false 183 63 84
Circle -7500403 true true 75 75 150
Circle -16777216 false false 75 75 150
Circle -1 true false 33 63 84
Circle -16777216 false false 33 63 84

pentagon
false
0
Polygon -7500403 true true 150 15 15 120 60 285 240 285 285 120

person
false
0
Circle -7500403 true true 110 5 80
Polygon -7500403 true true 105 90 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285 180 195 195 90
Rectangle -7500403 true true 127 79 172 94
Polygon -7500403 true true 195 90 240 150 225 180 165 105
Polygon -7500403 true true 105 90 60 150 75 180 135 105

person business
false
0
Rectangle -1 true false 120 90 180 180
Polygon -13345367 true false 135 90 150 105 135 180 150 195 165 180 150 105 165 90
Polygon -7500403 true true 120 90 105 90 60 195 90 210 116 154 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285 180 195 183 153 210 210 240 195 195 90 180 90 150 165
Circle -7500403 true true 110 5 80
Rectangle -7500403 true true 127 76 172 91
Line -16777216 false 172 90 161 94
Line -16777216 false 128 90 139 94
Polygon -13345367 true false 195 225 195 300 270 270 270 195
Rectangle -13791810 true false 180 225 195 300
Polygon -14835848 true false 180 226 195 226 270 196 255 196
Polygon -13345367 true false 209 202 209 216 244 202 243 188
Line -16777216 false 180 90 150 165
Line -16777216 false 120 90 150 165

person construction
false
0
Rectangle -7500403 true true 123 76 176 95
Polygon -1 true false 105 90 60 195 90 210 115 162 184 163 210 210 240 195 195 90
Polygon -13345367 true false 180 195 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285
Circle -7500403 true true 110 5 80
Line -16777216 false 148 143 150 196
Rectangle -16777216 true false 116 186 182 198
Circle -1 true false 152 143 9
Circle -1 true false 152 166 9
Rectangle -16777216 true false 179 164 183 186
Polygon -955883 true false 180 90 195 90 195 165 195 195 150 195 150 120 180 90
Polygon -955883 true false 120 90 105 90 105 165 105 195 150 195 150 120 120 90
Rectangle -16777216 true false 135 114 150 120
Rectangle -16777216 true false 135 144 150 150
Rectangle -16777216 true false 135 174 150 180
Polygon -955883 true false 105 42 111 16 128 2 149 0 178 6 190 18 192 28 220 29 216 34 201 39 167 35
Polygon -6459832 true false 54 253 54 238 219 73 227 78
Polygon -16777216 true false 15 285 15 255 30 225 45 225 75 255 75 270 45 285

person doctor
false
0
Polygon -7500403 true true 105 90 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285 180 195 195 90
Polygon -13345367 true false 135 90 150 105 135 135 150 150 165 135 150 105 165 90
Polygon -7500403 true true 105 90 60 195 90 210 135 105
Polygon -7500403 true true 195 90 240 195 210 210 165 105
Circle -7500403 true true 110 5 80
Rectangle -7500403 true true 127 79 172 94
Polygon -1 true false 105 90 60 195 90 210 114 156 120 195 90 270 210 270 180 195 186 155 210 210 240 195 195 90 165 90 150 150 135 90
Line -16777216 false 150 148 150 270
Line -16777216 false 196 90 151 149
Line -16777216 false 104 90 149 149
Circle -1 true false 180 0 30
Line -16777216 false 180 15 120 15
Line -16777216 false 150 195 165 195
Line -16777216 false 150 240 165 240
Line -16777216 false 150 150 165 150

person farmer
false
0
Polygon -7500403 true true 105 90 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285 180 195 195 90
Polygon -1 true false 60 195 90 210 114 154 120 195 180 195 187 157 210 210 240 195 195 90 165 90 150 105 150 150 135 90 105 90
Circle -7500403 true true 110 5 80
Rectangle -7500403 true true 127 79 172 94
Polygon -13345367 true false 120 90 120 180 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285 180 195 180 90 172 89 165 135 135 135 127 90
Polygon -6459832 true false 116 4 113 21 71 33 71 40 109 48 117 34 144 27 180 26 188 36 224 23 222 14 178 16 167 0
Line -16777216 false 225 90 270 90
Line -16777216 false 225 15 225 90
Line -16777216 false 270 15 270 90
Line -16777216 false 247 15 247 90
Rectangle -6459832 true false 240 90 255 300

person graduate
false
0
Circle -16777216 false false 39 183 20
Polygon -1 true false 50 203 85 213 118 227 119 207 89 204 52 185
Circle -7500403 true true 110 5 80
Rectangle -7500403 true true 127 79 172 94
Polygon -8630108 true false 90 19 150 37 210 19 195 4 105 4
Polygon -8630108 true false 120 90 105 90 60 195 90 210 120 165 90 285 105 300 195 300 210 285 180 165 210 210 240 195 195 90
Polygon -1184463 true false 135 90 120 90 150 135 180 90 165 90 150 105
Line -2674135 false 195 90 150 135
Line -2674135 false 105 90 150 135
Polygon -1 true false 135 90 150 105 165 90
Circle -1 true false 104 205 20
Circle -1 true false 41 184 20
Circle -16777216 false false 106 206 18
Line -2674135 false 208 22 208 57

person lumberjack
false
0
Polygon -7500403 true true 105 90 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285 180 195 195 90
Polygon -2674135 true false 60 196 90 211 114 155 120 196 180 196 187 158 210 211 240 196 195 91 165 91 150 106 150 135 135 91 105 91
Circle -7500403 true true 110 5 80
Rectangle -7500403 true true 127 79 172 94
Polygon -6459832 true false 174 90 181 90 180 195 165 195
Polygon -13345367 true false 180 195 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285
Polygon -6459832 true false 126 90 119 90 120 195 135 195
Rectangle -6459832 true false 45 180 255 195
Polygon -16777216 true false 255 165 255 195 240 225 255 240 285 240 300 225 285 195 285 165
Line -16777216 false 135 165 165 165
Line -16777216 false 135 135 165 135
Line -16777216 false 90 135 120 135
Line -16777216 false 105 120 120 120
Line -16777216 false 180 120 195 120
Line -16777216 false 180 135 210 135
Line -16777216 false 90 150 105 165
Line -16777216 false 225 165 210 180
Line -16777216 false 75 165 90 180
Line -16777216 false 210 150 195 165
Line -16777216 false 180 105 210 180
Line -16777216 false 120 105 90 180
Line -16777216 false 150 135 150 165
Polygon -2674135 true false 100 30 104 44 189 24 185 10 173 10 166 1 138 -1 111 3 109 28

person police
false
0
Polygon -1 true false 124 91 150 165 178 91
Polygon -13345367 true false 134 91 149 106 134 181 149 196 164 181 149 106 164 91
Polygon -13345367 true false 180 195 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285
Polygon -13345367 true false 120 90 105 90 60 195 90 210 116 158 120 195 180 195 184 158 210 210 240 195 195 90 180 90 165 105 150 165 135 105 120 90
Rectangle -7500403 true true 123 76 176 92
Circle -7500403 true true 110 5 80
Polygon -13345367 true false 150 26 110 41 97 29 137 -1 158 6 185 0 201 6 196 23 204 34 180 33
Line -13345367 false 121 90 194 90
Line -16777216 false 148 143 150 196
Rectangle -16777216 true false 116 186 182 198
Rectangle -16777216 true false 109 183 124 227
Rectangle -16777216 true false 176 183 195 205
Circle -1 true false 152 143 9
Circle -1 true false 152 166 9
Polygon -1184463 true false 172 112 191 112 185 133 179 133
Polygon -1184463 true false 175 6 194 6 189 21 180 21
Line -1184463 false 149 24 197 24
Rectangle -16777216 true false 101 177 122 187
Rectangle -16777216 true false 179 164 183 186

person service
false
0
Polygon -7500403 true true 180 195 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285
Polygon -1 true false 120 90 105 90 60 195 90 210 120 150 120 195 180 195 180 150 210 210 240 195 195 90 180 90 165 105 150 165 135 105 120 90
Polygon -1 true false 123 90 149 141 177 90
Rectangle -7500403 true true 123 76 176 92
Circle -7500403 true true 110 5 80
Line -13345367 false 121 90 194 90
Line -16777216 false 148 143 150 196
Rectangle -16777216 true false 116 186 182 198
Circle -1 true false 152 143 9
Circle -1 true false 152 166 9
Rectangle -16777216 true false 179 164 183 186
Polygon -2674135 true false 180 90 195 90 183 160 180 195 150 195 150 135 180 90
Polygon -2674135 true false 120 90 105 90 114 161 120 195 150 195 150 135 120 90
Polygon -2674135 true false 155 91 128 77 128 101
Rectangle -16777216 true false 118 129 141 140
Polygon -2674135 true false 145 91 172 77 172 101

person soldier
false
0
Rectangle -7500403 true true 127 79 172 94
Polygon -10899396 true false 105 90 60 195 90 210 135 105
Polygon -10899396 true false 195 90 240 195 210 210 165 105
Circle -7500403 true true 110 5 80
Polygon -10899396 true false 105 90 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285 180 195 195 90
Polygon -6459832 true false 120 90 105 90 180 195 180 165
Line -6459832 false 109 105 139 105
Line -6459832 false 122 125 151 117
Line -6459832 false 137 143 159 134
Line -6459832 false 158 179 181 158
Line -6459832 false 146 160 169 146
Rectangle -6459832 true false 120 193 180 201
Polygon -6459832 true false 122 4 107 16 102 39 105 53 148 34 192 27 189 17 172 2 145 0
Polygon -16777216 true false 183 90 240 15 247 22 193 90
Rectangle -6459832 true false 114 187 128 208
Rectangle -6459832 true false 177 187 191 208

person student
false
0
Polygon -13791810 true false 135 90 150 105 135 165 150 180 165 165 150 105 165 90
Polygon -7500403 true true 195 90 240 195 210 210 165 105
Circle -7500403 true true 110 5 80
Rectangle -7500403 true true 127 79 172 94
Polygon -7500403 true true 105 90 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285 180 195 195 90
Polygon -1 true false 100 210 130 225 145 165 85 135 63 189
Polygon -13791810 true false 90 210 120 225 135 165 67 130 53 189
Polygon -1 true false 120 224 131 225 124 210
Line -16777216 false 139 168 126 225
Line -16777216 false 140 167 76 136
Polygon -7500403 true true 105 90 60 195 90 210 135 105

plant
false
0
Rectangle -7500403 true true 135 90 165 300
Polygon -7500403 true true 135 255 90 210 45 195 75 255 135 285
Polygon -7500403 true true 165 255 210 210 255 195 225 255 165 285
Polygon -7500403 true true 135 180 90 135 45 120 75 180 135 210
Polygon -7500403 true true 165 180 165 210 225 180 255 120 210 135
Polygon -7500403 true true 135 105 90 60 45 45 75 105 135 135
Polygon -7500403 true true 165 105 165 135 225 105 255 45 210 60
Polygon -7500403 true true 135 90 120 45 150 15 180 45 165 90

square
false
0
Rectangle -7500403 true true 30 30 270 270

square 2
false
0
Rectangle -7500403 true true 30 30 270 270
Rectangle -16777216 true false 60 60 240 240

star
false
0
Polygon -7500403 true true 151 1 185 108 298 108 207 175 242 282 151 216 59 282 94 175 3 108 116 108

target
false
0
Circle -7500403 true true 0 0 300
Circle -16777216 true false 30 30 240
Circle -7500403 true true 60 60 180
Circle -16777216 true false 90 90 120
Circle -7500403 true true 120 120 60

tree
false
0
Circle -7500403 true true 118 3 94
Rectangle -6459832 true false 120 195 180 300
Circle -7500403 true true 65 21 108
Circle -7500403 true true 116 41 127
Circle -7500403 true true 45 90 120
Circle -7500403 true true 104 74 152

triangle
false
0
Polygon -7500403 true true 150 30 15 255 285 255

triangle 2
false
0
Polygon -7500403 true true 150 30 15 255 285 255
Polygon -16777216 true false 151 99 225 223 75 224

truck
false
0
Rectangle -7500403 true true 4 45 195 187
Polygon -7500403 true true 296 193 296 150 259 134 244 104 208 104 207 194
Rectangle -1 true false 195 60 195 105
Polygon -16777216 true false 238 112 252 141 219 141 218 112
Circle -16777216 true false 234 174 42
Rectangle -7500403 true true 181 185 214 194
Circle -16777216 true false 144 174 42
Circle -16777216 true false 24 174 42
Circle -7500403 false true 24 174 42
Circle -7500403 false true 144 174 42
Circle -7500403 false true 234 174 42

turtle
true
0
Polygon -10899396 true false 215 204 240 233 246 254 228 266 215 252 193 210
Polygon -10899396 true false 195 90 225 75 245 75 260 89 269 108 261 124 240 105 225 105 210 105
Polygon -10899396 true false 105 90 75 75 55 75 40 89 31 108 39 124 60 105 75 105 90 105
Polygon -10899396 true false 132 85 134 64 107 51 108 17 150 2 192 18 192 52 169 65 172 87
Polygon -10899396 true false 85 204 60 233 54 254 72 266 85 252 107 210
Polygon -7500403 true true 119 75 179 75 209 101 224 135 220 225 175 261 128 261 81 224 74 135 88 99

van side
false
0
Polygon -7500403 true true 26 147 18 125 36 61 161 61 177 67 195 90 242 97 262 110 273 129 260 149
Circle -16777216 true false 43 123 42
Circle -16777216 true false 194 124 42
Polygon -16777216 true false 45 68 37 95 183 96 169 69
Line -7500403 true 62 65 62 103
Line -7500403 true 115 68 120 100
Polygon -1 true false 271 127 258 126 257 114 261 109
Rectangle -16777216 true false 19 131 27 142

wheel
false
0
Circle -7500403 true true 3 3 294
Circle -16777216 true false 30 30 240
Line -7500403 true 150 285 150 15
Line -7500403 true 15 150 285 150
Circle -7500403 true true 120 120 60
Line -7500403 true 216 40 79 269
Line -7500403 true 40 84 269 221
Line -7500403 true 40 216 269 79
Line -7500403 true 84 40 221 269

x
false
0
Polygon -7500403 true true 270 75 225 30 30 225 75 270
Polygon -7500403 true true 30 75 75 30 270 225 225 270

@#$#@#$#@
NetLogo 5.0
@#$#@#$#@
@#$#@#$#@
@#$#@#$#@
@#$#@#$#@
@#$#@#$#@
default
0.0
-0.2 0 1.0 0.0
0.0 1 1.0 0.0
0.2 0 1.0 0.0
link direction
true
0
Line -7500403 true 150 150 90 180
Line -7500403 true 150 150 210 180

@#$#@#$#@
0
@#$#@#$#@
