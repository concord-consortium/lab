; Airbags24.v2T.nlogo
; Started July 2012
; Bob Tinker
; March 23 2013

; This code is based on a graphing utility that I have developed in NetLogo
; The software keeps separate "problem coordinates" and  "screen coordinates." 
; problem coordinates can be any size and range. They are designated by x and y
; screen coordinates must use screen (or patch) coordinates, designated by u and v
; screen coordinated must fit on the screen defined by (min-xcor, min-ycor) and (max-xcor, max-ycor)
; the 'stage' is where something can be moved by the user to generate a graph or by the software, animatting a graph
; The user can select any one of several actors to move, thus creating many possible stories.
; the stage can be vertical, horizontal, or absent. 
; Datasets are named by their color in a way that makes it trivial to add datasets by adding new colors in the pull-down lists. 
; The x,y values of data are saved in turtles called dots in x-val and y-val. ploce x-val y-val converts these into screen coordinates and shows the resulting dots

__includes [ "data-export-modular.nls" ]

globals [
  ; author globals
  grid-x-Color     ; the color of the grid in the main graph for the position graph
  back-x-Color     ; the color of the background in the main graph for the position graph
  grid-v-Color     ; the color of the grid in the main graph for the velocity graph
  back-v-color     ; the color of the grid in the main graph for the velocity graph
  grid2-color back2-color
  text-color text2-color
  safe-color maybe-color unsafe-color
  stiffness-inflating
  stiffness-inflated
  time-to-stop-going-40
  dummy-size
  experiment-duration-in-sec
  t-delay
  a-cutoff
  bag-mult
  dum-friction-left
  dum-friction-right
  penetration
  omit-question?
  always-erase?
  parameter-graph? 
  shutoff-enabled?
  bag?
  vertical-axis
  horizontal-axis
  car-speed
  distance-to-steering-wheel
  
  Filename   ; keep this up to date to link this code with the reports generated.
  grid-params ; see below
  walk-params ; see below
  grid2-params ; parameters that define the second graph--the parameter space graph.
  N-points      ; the number of points in a dataset
  actor-size
  normal-thickness
  selected-thickness
  deselected-thickness
  grid-separation
  TicLength      ; the length of the tic marks below the grid

  slow-mo?
  stage?        ; tells whether there is a stage
  min-x max-x
  w w1 w2 w3        ; used to store who-values between calls
  stage             ; contains "Horizontal" or "Vertical"
  x-label y-label
  t-start-inflate                ; The time at which the airbag starts inflating
  t-fully-inflated              ; the time at which the airbag is fully inflated
  t-car-stops             ; the time at which the car stops
  cursor1 cursor2         ; will hold the who of the dots at the end of the cursor

  a-max          ; the maximum acceleration during a run in mks units
  a-max-g        ; the maximum acceleration in units of g ( = a-max / 9.81)
  dummy-colors 
  run-number
  dummy-status  ; tells whether the dummy survives
  vertical-axis-type
  position-min
  position-max
  min-y max-y     ; the vertical axis limits that are actually used in draw-graph
  run-data        ; list that saves data from each run
  run-data-word   ; text version of run-data
  ; values used in computing inquiry patterns
  graph-type-used         ; will become a list of the display types used
  prior-runs-viewed      ; a list of all graphs other than the current one that were viewed during one run
  temp-data              ; stores part of the data from a run calculated at the end of the run, but stored only at the start of the next run
  date&time
  the-question           ; the question that the student is exploring
  starting-up?
  variables-locked?      ; if true, the user cannot change variabes or use the 
  ; variables that hold prevous values, used in detecting user changes.
  old-distance-to-steering-wheel
  old-enter-a-run-number
  old-car-speed
  old-airbag-size
  old-time-to-fill-bag
  old-vertical-axis
  old-horizontal-axis
  old-pick-graphs
  old-in-grid?
  old-in-grid2?
  old-pick-y-axis               ; used for the main graph
  dum-mass                 ; the effective mass of the dummy's upper body
  old-dummy-size
  dummy-crashed?   
  x-bag v-bag              ; position and velocity of the bag
  
  question-needed?           ; true if the user tries to run before entering the question
  used-slow-mo?            ; logical that is true if the slow-mo was used
  used-cursor?             ; logical that is true if the mouse ever entered the time-series graph
  was-in-grid?
  cursor-times             ; The number of times the mouse entered the time series graph area
  cursor-time-start
  cursor-time              ; The total time the mouse was in the time-series graph
  used-pointer?            ; true if the mouse ever entered the parameter graph
  pointer-times            ; The number of times the mouse entered the parameter graph area
  pointer-time             ; The total time the mouse was in the parameter graph area
  pointer-time-start       ; used for totaling up the time the cursor was in the parameter space graph
  hover-times              ; The number of times that the user hovered over a dot in the parameter graph area
  hover-time-start         ; The time at the beginning of a hover
  hovering?                ; logical that is true if the cursor is hovering over a dot
  old-hovering?
  activity-counter
  run-groups-used
  ]

breed [handles handle]     ; these are used to indicate handles that allow the user to move a sketched graph
breed [verticals]
breed [verticals2]
breed [scale-tics]
breed [horizontals]
breed [horizontals2]
breed [labels]
breed [labels2]                ; used to label the second graph
breed [actors actor ]          ; these are the things that move. 
breed [dots dot]               ; dots are the data points that are drawn on the screen
breed [dots2 dot2]             ; graphing objects for the second graph
breed [markers]
breed [box-dots box-dot]
breed [messages message]
breed [cursors cursor]
undirected-link-breed [lines line]  ; used to connect dots on a graph

actors-own [number]   ; used to tell #1 and #2 apart and where they are drawn
dots-own [ x-val y-val velocity acceleration dot-color a-max? run-n prior-who]         
      ; each dot knows its problem coordinates (x-val and y-val) and its velocity and acceleration
      ; it also knows its run number and whether its acceleration is a maximum acceleration for that run (max-a?) 
      ; Prior-who is the who of the dot that comes before this dot. If prior-who is zero, none comes before.
dots2-own [ car dist bag-size bag-time ]   ; dots used in the parameter graph. Each stores the parameters that define it. 
messages-own [number]
lines-own [run-num]

; grid-params contains  [ four lists ]
;   s-bounds (screen bounds) contains
;      uMin  the left edge of the grid in screen coordinates
;      uMax  the right edge of the grid
;      vMin  the bottom edge
;      vMax  the top edge
;   p-bounds (problem bounds) contains
;      xMin  the minimum value of x expected (the minimum value on the graph could be less)
;      xMax  the maximum value of x expected
;      yMin  the minimum value of y expected
;      yMax  the maximum value of y expected
;   label-list 
;      xLabel    the label for the x-axis
;      yLabel    the label for the y-axis
;   transforms
;      xm        the screen coordinate u can be computed from the problem value x using
;      xc            u = xm * x + xc
;      ym
;      yc        likewise v = ym * y + yc
;      nxTics    the number of tics along the x-axis
;      nyTics    the number of tics along the y-axis
;      xLow      the starting x-value on the x-axis
;      xHi       the ending x-value on the x-axis
;      yLow      the starting y-value on the y-axis 
;      yHi       the ending y-value on the y-axis

; walk-params contains     [list list value list]
;   s-bounds (screen bounds) contains
;      uMin  the left side of the stage in screen coordinates
;      uMax  the right side of the stage
;      vMin  the bottom of the stage
;      vMax  the top of the stage
;   p-bounds (problem bounds) contains
;      xMin  the minimum value of x expected (the minimum value on the scale could be less)
;      xMax  the maximum value of x expected
;   label    the label below the scale 
;   transforms
;      m        the screen coordinate u can be computed from the problem value x using
;      c            u = m * x + c
;      nxTics    the number of tics along the scale
;      Low      the starting x-value on the scale
;      Hi       the ending x-value on the scale
; Packaging the parameters this way makes it easy to re-configure the screen and add new graphs or stages. 

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; startup routines ;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to startup
  clear-all
  reset-ticks                                     ; clear everything
  set what-is-your-goal? ""
  show-start-screen
  set starting-up? true
end 

to show-start-screen
  create-dots 1 [
    setxy 0 .72 * max-pycor 
    set label-color red
    set size .1
    set label "Click the On/Off button to turn on this model."]
  create-dots 1 [
    setxy .65 * min-pxcor .8 * max-pycor 
    set color red set pen-size 3
    set size 5 set heading 315
    pd ]
  let i 0 ; let n 100 
  while [i < 30][
    ask dots with [heading = 315]  [fd .2 ]
    tick 
    set i i + 1 ]
end

to initialize
  initialize-author-tools
  set date&time date-and-time   ; record the starting time for this set of runs
  set filename "Airbags24.v2T.nlogo"
  output-print (word "Run Survives   MA    Bag size  Fill time")
  set run-number 0
  set vertical-axis-type "Position (m)"
  set old-pick-y-axis  vertical-axis-type
  set pick-y-axis vertical-axis-type
  set run-data [ ]      ; this global stores the results of runs. Each run creates a list of data 

  setup-data-export     ;;; initialize the modular JSON data export functions
    
  ; initialize globals   
  ; set slider defaults
  set car-speed 20
  set airbag-size .24
  set distance-to-steering-wheel .38
  set time-to-fill-bag .02
  
;  set grid-x-color white   ; the color of the grid lines for a position graph
;  set back-x-color 121  ; the color of the background for a position graph
;  set grid-v-color yellow   ; the color of the grid lines for a velocity graph
;  set back-v-color 21   ; the color of the background for a velocity graph  
;  set back2-color 102      ; the background color of graph2--the parameter space 101 is a dark blue
  
  set ticLength 1     ; the length of the tic marks below the grid   
  set position-max .5
  set position-min 0
  set min-y position-min  ; set up the default graph for position values
  set max-y position-max
  set x-label "Time (sec)"
  set N-points 120          ; the number of points in each dataset
  set grid-separation 50    ; the target number of pixels between grid lines
  set actor-size  35        ; controls the size of actors
  set min-x 0
  set max-x experiment-duration-in-sec
  set stage? true   ; stage tells whether there is any stage
  set stage "Horizontal"
  set y-label "Position (m)"
  set variables-locked? true
  set temp-data []
  set graph-type-used []
  set was-in-grid? false

  set old-distance-to-steering-wheel distance-to-steering-wheel
  set enter-a-run-number 0
  set old-enter-a-run-number enter-a-run-number
  set old-car-speed car-speed
  set old-airbag-size airbag-size
  set old-time-to-fill-bag time-to-fill-bag
  set old-vertical-axis vertical-axis
  set old-horizontal-axis horizontal-axis
  set pick-graphs "Last 1"
  set old-pick-graphs pick-graphs
  set old-in-grid? false
  set old-in-grid2? false
  set old-dummy-size "Normal Adult"
  set dummy-size old-dummy-size
  set dum-mass 20 ; the effective dynamic mass of the upper body of the dummy
  set normal-thickness .5               ; the nurmal thickness of graph lines
  set selected-thickness .8             ; line thickness when selected or thickened to show max acceleration
  set deselected-thickness .05          ; line thickness when deselected

  create-markers 1 [ht]                  ; use this for general-purpose drawing 

 ; create the actors that will be moved and animated--two for the stage and two smaller for the graph
 ; at this point the actors are defined, but not placed
 ; the following is modified for the airbags 
 ; first create the larger actors for the stage
  create-actors 1 [               ; create an airbag 
    set size 1 set number 1 ; the airbag
    set shape "circle" ]
  create-actors 1 [                              ; create a large headless dummy for the stage
    set size actor-size set number 2 
    set shape "dummy-body" 
    set color red ] ; for the first run, the dummy is red
 create-actors 1 [                              ; create a dummy head
    set size actor-size set number 3 
    set shape "dummy-head" 
    set heading 0
    set color red ] ; for the first run, the dummy is red
 create-messages 1 [
   set number 0
   set label "To continue, you must select a goal"
   set label-color red
   setxy .25 * min-pxcor .7 * max-pycor ht]
 create-messages 1 [ ht ; used to show when the car stopped.
   set number 1
   set heading 180 set size 4
   set size 4
   set color red ]
 create-messages 1 [ ht ; used to label where the car stopped.
   set number 2
   set size  0
   set label "Car stopped   "
   set color red ]

 create-cursors 1 [set cursor1 who ht]    ; create two invisible turtles with a line between them that will be used as a cursor
 create-cursors 1 [set cursor2 who ht               ; by default these are at 0,0 and therefore there is no visible line between them
   create-line-with cursor cursor1 ]

 
    ; get ready to draw grid by creating grid-params, which contains all the information needed to draw the grid
  let bounds layout         ; the screen boundaries for the screen and stage are set in the procedure "layout" which returns a list of two lists
  let bounds2 layout2 
  let s-bounds first bounds
  let sw-bounds last bounds
  let p-bounds (list Min-x Max-x Min-y Max-y)             ; all these are globals set by the user with input boxes
  let p2-bounds get-param-bounds                          ; gets bounds for the physical values, but for the parameter graph--depends on the variables being graphed
  let label-list (list  x-label y-label)
  set grid-params (list s-bounds p-bounds label-list 0)   ; this creates the grid-params, but with a place-holder for the transforms
      ;  this will not create a grid until "scale-grid" is called to create the actual scale and transforms which are held in the fourth item.                                   
          ;  "draw-view" calls "scale-grid" which completes the information in grid-params
          ; get ready to draw stage scale by creating walk-params, which contains all the information needed to draw the walk scale
          ; The scale represents the distance the actors walk/drive
  set grid2-params (list bounds2 p2-bounds ["" ""] 0)     
  let pw-bounds list min-x max-x    
  let tag-line y-label
  set pw-bounds list min-y max-y                       
  set walk-params (list sw-bounds pw-bounds tag-line 0) ; this creates the walk-params, but with a place-holder for the transforms
          ; At thie point, walk-params is incomplete until scale-stage is called, because it lacks the transforms. "draw-view" calls "scale-stage"

  draw-view ; creates everthing in the view--all graphs and actors. 
    ; once executed, everything needed to draw the view is contained in grid-params and walk-params and grid2-params
  reset-ticks
end

to-report layout  ; uses the global 'stage' and the screen boundaries to locate the screen and stage
  ; three layouts are supported--a vertical stage, a horizontal one, or none. 
  ; data are return as a list of two elements. The first element is s-boundary for the grid and the second is s-boundary for the stage
  let edge 4         ; space allocated around the edges of the grid and stage where there is no scale
  let edge+ 7        ; space needed for scale
  let walk-width 35  ; 
  let m-pxcor .1 * max-pxcor   ; set a right edge to leave lots of room for another graph
  let uMin min-pxcor + edge+                    
  let uwMin uMin
  let uMax m-pxcor - edge
  let uwMax m-pxcor - edge 
  let vMin min-pycor + edge+
  let vwMax max-pycor - edge
  let vwMin vwMax - walk-width
  let vMax vwMin - edge
  let s-b (list uMin uMax vMin vMax)
  let sw-b (list uwMin uwMax vwMin vwMax)
    report list s-b sw-b 
end

to-report layout2  ; creates a layout for the second graph in the lower right
  let edge 4         ; space allocated around the edges of the grid and stage where there is no scale
  let edge+ 7        ; space needed for scale
  let uMin .1 * max-pxcor + edge+                    
  let uMax max-pxcor - edge
  let vMin min-pycor + edge+
  let vMax .2 * max-pxcor - edge
  if parameter-graph? [
    ask patches [ 
      if pxcor >= (uMin - edge+ ) and pxcor <= max-pxcor and
         pycor >= (vMin - edge+ ) and pycor <= vMax + edge+
         [set pcolor back2-color]]]  ; background color for grid2
  report (list uMin uMax vMin vMax)  ; these are the min and max for the second graph
end

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;; top-level routines ;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to on/off    ; this is the main execution loop
  if starting-up? [   ; executed only once the first time the on/off button is pressed
    ask dots [die]     ; clears the startup screen
    set starting-up? false
    initialize ]       ; initializes everything but only once after setup has set starting-up? true
  act-on-changes       ; checks for user actions and takes appropriate actions
  if mouse-inside? [support-mouse]   ; supports mouse functions inside the two graphs
  tick
end

to act-on-changes   ; look for changes in the sliders and selectors and takes appropriate action 
  ; This is inside the on/off forever loop
  if omit-question? [set variables-locked? false]    ; this is for debugging. the user doesn't get to omit the question
  set question-needed? false
  if what-is-your-goal? != "" [       ; if there is some question
    set variables-locked? false           ; unlock the variables
    ask messages with [number = 0 ][ht]]  ; turn off the 'enter question' message
      
  if old-distance-to-steering-wheel != distance-to-steering-wheel [   ; indicates that this slider has been changed
     ifelse variables-locked?          ; if the variables are locked... 
       [set distance-to-steering-wheel old-distance-to-steering-wheel ; reset this variable...
         set question-needed? true]                 ; and note that the user tried to change a variable. 
       [set old-distance-to-steering-wheel distance-to-steering-wheel ; if not locked...
         draw-actor-on-stage 1 0 0 white             ; draw the dummy and airbag at the right places
         draw-actor-on-stage 2 distance-to-steering-wheel 0 cyan
         draw-actor-on-stage 3 distance-to-steering-wheel 0 cyan]]  ; changes in the slider show up immediately in the position of the dummy
  
  if old-enter-a-run-number != enter-a-run-number  [ ; detect a change in the run-number input...
    set old-enter-a-run-number enter-a-run-number       ; and show that run
       display-run enter-a-run-number
       update-run-data ]
  
  if old-vertical-axis != vertical-axis [
    set old-vertical-axis vertical-axis  
    set grid2-params replace-item 2 grid2-params list horizontal-axis vertical-axis 
    draw-view   ; 
    update-run-data ]
  
  if old-horizontal-axis != horizontal-axis [
    set old-horizontal-axis horizontal-axis 
    set grid2-params replace-item 2 grid2-params list horizontal-axis vertical-axis 
    draw-view  ; 
    update-run-data ]
  
  if car-speed != old-car-speed [  ; if the variables are locked, don't let the user change this variable
    ifelse variables-locked? 
      [set car-speed old-car-speed set question-needed? true]
      [set old-car-speed car-speed ]]
  
  if old-airbag-size != airbag-size [
    ifelse variables-locked? 
      [set airbag-size old-airbag-size set question-needed? true]
      [set old-airbag-size airbag-size ]] 
  
  if old-time-to-fill-bag != time-to-fill-bag [
     ifelse variables-locked? 
       [set time-to-fill-bag old-time-to-fill-bag set question-needed? true]
       [set old-time-to-fill-bag time-to-fill-bag]]
  
  if old-pick-graphs != pick-graphs [     ; the user has changed the pick-graph chooser
    set old-pick-graphs pick-graphs
    handle-pick-graph-selector 
    update-run-data ]
  
  if old-dummy-size != dummy-size [      ; use the size selector to set the dummy's effective mass
    set old-dummy-size dummy-size
    if dummy-size = "Baby" [set dum-mass 5]
    if dummy-size = "Child" [set dum-mass 12]
    if dummy-size = "Normal Adult" [set dum-mass 20]
    if dummy-size = "Overweight Adult" [set dum-mass 40]]
  
  if old-pick-y-axis != pick-y-axis [
    set old-pick-y-axis pick-y-axis
    set-y-axis 
    update-run-data ]
  
  if question-needed? [
    beep 
;    update-run-data
    ask messages with [number = 0 ] [st]]  ; show the 'select question' message

end

to handle-pick-graph-selector 
  if run-number = 0 [stop]  ; run number contains the number of the latest run. If 0, there are no runs. 
  erase-graphs
  
  set run-groups-used lput pick-graphs run-groups-used  ; save for research
  
  if pick-graphs = "Last 1" [
    display-run run-number ]
  if pick-graphs = "Last 3" [
    let i 1
    while [i <= run-number] [
      if i > (run-number - 3 ) [
        display-run i]
      set i i + 1 ]]
  if pick-graphs = "Last 10" [
    let i 1
    while [i <= run-number] [
      if i > (run-number - 10 ) [
        display-run i]
      set i i + 1 ]]
  if pick-graphs = "All" [
    let i 1
    while [i <= run-number][
      display-run i
      set i i + 1 ]]
  if pick-graphs = "Blue Only (survived)" [
    display-runs-colored blue]
  if pick-graphs = "Orange Only (maybe)" [
    display-runs-colored orange]
  if pick-graphs = "Magenta Only (died)" [
    display-runs-colored magenta]
end

to support-mouse      ; first ask whether the mouse is in one of the grids

  if in-grid? mouse-xcor mouse-ycor [  ; if in the main grid and there is only one graph, support a cursor
    ; first figure out whether there is just one run showing.
    let n-graphs 0 let graph-number 0
    let i 1
    while [i <= run-number ][
      if not ([hidden?] of one-of dots with [run-n = i]) [
          set n-graphs n-graphs + 1 
          set graph-number i ]
      set i i + 1 ]
    if n-graphs = 1 [   ; if exactly one graph is showing and its number is graph-number
      
      if not was-in-grid? [      ; get here only when entering the grid--used for research data collection
        set used-cursor? true
        set was-in-grid? true
        set cursor-times cursor-times + 1 
        update-run-data    ; save the fact that the cursor entered the grid
        set cursor-time-start timer ]; save the time when entered 
      
      ; unpack the parts of graph-params that are needed
      let trans item 3 grid-params
      let mx first trans 
      let cx item 1 trans
      let s-bounds first grid-params
      let vMin item 2 s-bounds
      let vMax item 3 s-bounds
      ask cursor cursor1 [
        setxy mouse-xcor vMax]
      ask cursor cursor2 [
        setxy mouse-xcor vMin]
      ask line cursor1 cursor2 [set hidden? false]  ; now the cursor shows
      ; next, find the dummy dot on graph graph-number with the nearest time
      let cursor-x-val (mouse-xcor - cx) / mx  ; the time corresponding to the cursor
      let dif 100 let y 0
      ask dots with [(run-n = graph-number) and color != 7 ] [ ; check with each dummy dot in the run
        if abs (x-val - cursor-x-val) < dif [
          set dif abs (x-val - cursor-x-val)
          set y y-val]]                     ; save the displacement of this dot (NOTE: MAY NOT WORK FOR VELOCITY GRAPHS)
      set dif 100 let yb 0
      ask dots with [(run-n = graph-number) and color = 7 ] [ ; check with each bag dot in the run
        if abs (x-val - cursor-x-val) < dif [
          set dif abs (x-val - cursor-x-val)
          set yb y-val]]      
      draw-actor-on-stage 1 (yb / 2) 0 white  ; draw the bag
      draw-actor-on-stage 2 y 0 cyan   ; draw the dummy
      draw-actor-on-stage 3 y 0 cyan ]] 
  if not (in-grid? mouse-xcor mouse-ycor) and was-in-grid?  [
      set was-in-grid? false    ; you get here only the first time the mouse leaves the grid
      ask line cursor1 cursor2 [set hidden? true]  ; end of support for the cursor in the main grid
      set cursor-time cursor-time + timer - cursor-time-start ]    ; add to the previous cursor-time, the time 
  
  ; start of support for the cursor when the mouse is in grid2, the parameter graph
  let ig2? in-grid2? mouse-xcor mouse-ycor  ; shorthand for 'in grid 2'
  if ig2? and (not old-in-grid2?) [    ; if the mouse is in the grid2 but was not last time
    set old-in-grid2? true             ; reset flag
    set old-hovering? false            ; the user is not hovering over a point
    
    set used-pointer? true             ; used for research
    set pointer-times pointer-times + 1 
    set pointer-time-start timer       ; save the time entered
    update-run-data
    
    ask lines [set thickness deselected-thickness]]       ; dim the lines
  if (not ig2?) and old-in-grid2? [    ; on exit to grid2
    set old-in-grid2? false            ; reset flag
       ; restore the thickness of the lines on leaving grid2
    ask lines [set thickness normal-thickness  ]
    set pointer-time pointer-time + timer - pointer-time-start]
  if ig2? [                            ; now thicken runs that are near the cursor
    let i 1  set hovering? false       ; check each run 
    while [i <= run-number ][
      ifelse cursor-near? i  
        [ ask lines with [run-num = i] [set thickness selected-thickness] ; brighten the lines in run i
          set hovering? true ]         ; note that the user is near some run
        [ ask lines with [run-num = i] [set thickness deselected-thickness]] ; dim the lines in run i
      set i i + 1]
    if hovering? and not old-hovering? [  ; if this is the first time hovering was noticed
      set old-hovering? hovering?         
      set hover-times hover-times + 1   ; increment the hovering counter
      update-run-data ]
    if not hovering? [set old-hovering? false]]
end
    
to-report cursor-near? [n]               ; reports true if the cursor is near the dot for run n in grid2
  let close 1                            ; sets how close the cursor has to get
  let x first [xcor] of dots2 with [n = read-from-string label]  ; the label of a dot2 contains a text consisting of some spaces & the run number
  let y first [ycor] of dots2 with [n = read-from-string label]
  report (abs (mouse-xcor - x ) < close ) and 
         (abs (mouse-ycor - y ) < close )
end

to draw-view
  clear-drawing                         ; gets rid of all turtle tracks, which are used for grid lines
  ask horizontals [die]                 ;   the grid generators
  ask verticals [die]
  ask horizontals2 [die]
  ask verticals2 [die]
  ask scale-tics [die]                  ;    and the tics
;  ask dots [ht]                         ; hide all the dots and tags

  scale-grid                            ; update the transformation coefficients for the grid
  draw-grid                             ; draw the grid
  scale-stage                           ; update the transformation coefficients for the walk scale
  draw-stage                            ; draw the walk (or stage) scale
  if parameter-graph? [
    scale-grid2                           ; scale and draw the parameter graph
    draw-grid2
    ask dots2 [
      place2 (p-value horizontal-axis) (p-value vertical-axis)]      ]
  place-actors   cyan
  ask dots with [run-n = run-number ]  [place x-val y-val]    ; put the data on the new grid

  tick
;  wait .2 ; needed b/c Logo seems to move the turtles in a separate thread that doesn't finish in time. 
end
  
to-report p-value [name]      ; reports the physical value of the point projected to the h and v axses (in dot2 context)
  if name = "Car speed" [report car ]
  if name = "Distance to steering wheel" [report dist]
  if name = "Airbag size" [report bag-size]
  if name = "Time to fill bag" [report bag-time]
end
    

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;; Supporting actors  ;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to place-actors [clr]; sets actors at their initial positions
    draw-actor-on-stage 1 min-x 0 clr ; place the airbag at beginning of the stage
    draw-actor-on-stage 2 distance-to-steering-wheel 0 clr; place the dummy body
    draw-actor-on-stage 3 distance-to-steering-wheel 0 clr; place the dummy head
end


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;; making and displaying graphs ;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to auto-scale                                         ; looks through all the data and picks p-scales to show all selected data
  let xmax -1e20 let xmin 1e20
  let ymax -1e20 let ymin 1e20
  ask dots [                                            ; find the largest and smallest coordinates of all dots. 
    if x-val > xmax [set xmax x-val]
    if x-val < xmin [set xmin x-val]
    if y-val > ymax [set ymax y-val]
    if y-val < ymin [set ymin y-val]]
  set grid-params replace-item 1 grid-params 
     (list xmin xmax ymin ymax)                       ; update the p-bounds in grid-params with the new range 
  if stage? [set walk-params replace-item 1 walk-params  
     (list ymin ymax)  ]                               ; update the w-bounds in grid-params with the new range 
  draw-view                                           ; use the new parameters to draw the grid and graphs
end

to-report mouse-in-grid? ; reports whether the mouse is in the graphing grid 
  report in-grid? mouse-xcor mouse-ycor
end

to-report mouse-in-stage? ; reports whether the mouse is in the stage
  report in-stage? mouse-xcor mouse-ycor
end

to-report in-grid? [u v]
  let s-bounds first grid-params
  let uMin first s-bounds
  let uMax item 1 s-bounds
  let vMin item 2 s-bounds
  let vMax item 3 s-bounds
  ifelse (u < uMin or u > uMax or v < vMin or v > vMax) 
    [report false ][report true]
end

to-report in-grid2? [u v]  ; reports true if u,v is inside the second grid--parameter graphs
  let s-bounds first grid2-params
  let uMin first s-bounds
  let uMax item 1 s-bounds
  let vMin item 2 s-bounds
  let vMax item 3 s-bounds
  ifelse (u < uMin or u > uMax or v < vMin or v > vMax) 
    [report false ][report true]
end

to-report in-stage? [u v]
  let s-bounds first walk-params             ; extract the stage boundaries
  let umin first s-bounds - 1
  let umax item 1 s-bounds + 1
  let vmin (item 2 s-bounds - 2)             ; the 2 gives the user a bit more room for straying from the center line.  
  let vmax (item 3 s-bounds + 2)
  ifelse (u < uMin or u > uMax or v < vMin or v > vMax) 
    [report false ][report true]
end

to place [x y]  ; in dot context, places the current dot on the screen using problem coordinates x,y in the graph defined by grid-params
  ; unpack the parts of graph-params that are needed
  let trans item 3 grid-params
  let mx first trans 
  let cx item 1 trans
  let my item 2 trans
  let cy item 3 trans
  let u mx * x + cx                        ; the horz screen coordinate of the x-value
  let v my * y + cy                        ; the vertical screen coordinate of the y-valuee    
  
  let screen-bounds first grid-params
  let vmin item 2 screen-bounds
  let vmax last screen-bounds
  if v > vmax [set v vmax]
  if v < vmin [set v vmin]
  setxy u v                                
;  set visible? in-grid? u v                ; the dot variable visible? tells whether this dot is in the grid. 
;  ifelse visible? 
;    [ setxy u v st] [ht]                 ; move the turtle to the point u,v
end


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;; scale and grid-drawing routines ;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to scale-grid   ; Completes the grid-params by supplying the transform coeficients
  ; the input to this is grid-params but without transform coef
  ; this routine needs grid-params to contain the correct screen-bounds problem-bounds and label list
  ; screen-bounds are uMin  uMax  vMin  vMax which define the graphing window; tic marks and labels are drawn outside this
  ; problem-bounds are xMin xMax yMin yMax
  ; the x, y coordinates are the problem coordinates 
  
  ; For each axis, this program generates the best scale minimum and maxium 
  ;     and the best number of tic marks
  ; From these, it calculates the problem-to-screen transformations which are reported out

  let screen-bounds first grid-params
  let umin first screen-bounds
  let umax item 1 screen-bounds
  let vmin item 2 screen-bounds
  let vmax last screen-bounds
  
  let problem-bounds item 1 grid-params
  let xmin first problem-bounds
  let xmax item 1 problem-bounds
  let ymin item 2  problem-bounds
  let ymax last  problem-bounds
  
  ; set the background color     $$$$$$$$$$
  ask patches [
    if pxcor < umax + 2 and pycor < vmax + 5 [
      ifelse pick-y-axis = "Position (m)"
        [set pcolor back-x-color]
        [set pcolor back-v-color]]]
        
  let xTarget ( umax - umin ) * patch-size / grid-separation       ;  sets the target number of tics based on the size of the graphing area
                                                      ;  allocates about grid-separation pixels per tic
  let a ticMarks xMin xMax xTarget                    ; a now contains xlow, xhi, and ntics
  let xLow first a                                    ; unpack a
  let xHi first but-first a
  let xNTics last a    
  set a mcCoef xLow xHi uMin uMax                     ; get the transform pair m, c for u = mx + c
  let xm first a
  let xc last a

  let yTarget ( vmax - vmin ) * patch-size / grid-separation      
  set a ticMarks yMin yMax yTarget                    ; a now contains ylow, yhi, and ntics
  let yLow first a                                    ; unpack a
  let yHi item 1 a
  let yNTics last a
  set a mcCoef yLow yHi vMin vMax                     ; get the transform pair m, c
  let ym first a
  let yc last a
  let trans (list xm xc ym yc xNTics yNTics xLow xHi yLow yHi)
  set grid-params replace-item 3 grid-params trans    ; update grid-params
end
 
to draw-grid                                           ; draws the grid using grid-params

  let screen-bounds first grid-params
  let umin first screen-bounds
  let umax item 1 screen-bounds
  let vmin item 2 screen-bounds
  let vmax last screen-bounds
  
  let problem-bounds item 1 grid-params
  let xmin first problem-bounds
  let xmax item 1 problem-bounds
  let ymin item 2  problem-bounds
  let ymax last  problem-bounds
  
  let ll item 2 grid-params
  
  let coef item 3 grid-params
  let xm first coef        
  let xc item 1 coef
  let ym item 2 coef
  let yc item 3 coef
  let xNTics item 4 coef    ;the number of tics along the x-axis
  let yNTics item 5 coef    ;the number of tics along the y-axis
  let xLow item 6 coef      ;the starting x-value on the x-axis
  let xHi item 7 coef       ;the ending x-value on the x-axis
  let yLow item 8 coef      ;the starting y-value on the y-axis 
  let yHi item 9 coef       ;the ending y-value on the y-axis

  let dxx (xHi - xLow)/(xNtics - 1)                     ;  the distance between x-tics in problem coordinates
  let x xLow
  let c grid-v-color
  if pick-y-axis = "Position (m)" [set c grid-x-color]
  repeat xNtics [
    create-verticals 1 [                               ; create the vertical lines  by drawing down from the top
      set label precision x 3
      set label-color text-color
      set heading 180                                  ; aim down
        ifelse x = xLow or abs (x - xHi) < (.001 * abs xHi)  ; the second calculation is required because x might be slightly different than xHi after adding dxx several times. 
          [set color c set pen-size 2 ]             ; for the edges!
          [set color c set pen-size 1 ]             ; for the inside lines
        setxy (xm * x + xc) vmax 
        ]
     set x x + dxx ]                                     ; at this point turtles are poised to descend from the top of the graph
  ask verticals [ pd fd vmax + ticLength - vmin         ; draws all the verticals at once 
    pu fd 2 lt 90 fd 1 set size 0]                                 ; move a bit to center the text below the line
  ask labels [die]
  create-labels 1 [
    set label first ll
    setxy .5 * (uMin + uMax) vMin - 5
    set label-color text-color ]

  let dyy (yHi - yLow)/(yNtics - 1)                     ;  the distance between y-tics in problem coordinates
  let y yLow
  repeat yNtics [
    create-horizontals 1 [                               ; create the vertical lines  by drawing left from the right
      set label precision y 3
      set label-color text-color
      set heading 270                                  ; aim left
        ifelse y = yLow or abs (y - yHi) < (.001 * abs yHi)
          [set color c set pen-size 2 ]            ; for the edges!
          [set color c set pen-size 1 ]             ; for the inside lines
        setxy umax (ym * y + yc) 
        ]
     set y y + dyy ]                                     ; at this point turtles are poised to descend from the top of the graph
  ask horizontals [ pd fd umax + ticLength - umin       ; draws all the horizontals at once
     pu fd .7 lt 90 fd .6 set size 0]                               ; move left a bit to leave space for the label
  create-labels 1 [
    set label last ll
    setxy uMin + 8 vMax + 2.2
    set label-color text-color set size 0]
end

to set-scale  ; reads the user-supplied ranges, labels, and units and sets the graph scales accordingly
  set max-x experiment-duration-in-sec
  let pb (list min-x max-x min-y max-y)
  set grid-params replace-item 1 grid-params pb
  set grid-params replace-item 2 grid-params list x-label y-label ; read the user labels and put them in the right place.
  set walk-params replace-item 2 walk-params y-label
  set walk-params replace-item 1 walk-params list min-y max-y                      
  draw-view                                             ; use the new parameters to draw the grid and graphs
end

to scale-stage                                          ; completes walk-params to get ready to show walk scale

  let s-bounds first walk-params                        ; unpack needed variables
  let uMin first s-bounds                               ; "s-" for "stage"
  let uMax item 1 s-bounds
  let vMin item 2 s-bounds
  let vMax item 3 s-bounds
  
  let p-bounds item 1 walk-params  
  let xMin first p-bounds                               ; p-bounds contains  xw-min xw-max the problem range of the scale. 
  let xMax item 1 p-bounds
  let target 0 
  if stage = "Horizontal" [
    set Target ( uMax - uMin ) * patch-size / grid-separation  ]      ; sets the target number of tics based on the size of the graphing area                                                     
    ; allocates about one grid-separation pixels per tic
  if stage = "Vertical" [
      set Target ( vMax - vMin ) * patch-size / grid-separation  ]      ; sets the target number of tics based on the size of the graphing area                                                     
  let a ticMarks xMin xMax Target                    ; a now contains Low, Hi, and ntics, the low end of the scale in problem units, the high end, and the number of  tics

  let Low first a                                     ; unpack a
  let Hi item 1 a                                     ; Low and Hi are the min and max in problem coordinates
  let NTics last a   
  ifelse stage = "Horizontal"  
    [set a mcCoef Low Hi uMin uMax]                    ; get the transform pair m, c for u = mx + c
    [set a mcCoef Low Hi vMin vMax]
  let m first a
  let c last a
  let trans (list m c NTics Low Hi)
  set walk-params replace-item 3 walk-params trans     ; update the walk-params global with the computed transformation coefficients
end

to draw-stage                                          ; draws the horizontal scale on the stage--no vertical scale is needed
 if stage = "Horizontal" [                             ; do this entire procedure only if the stage is horizontal
  let s-bounds first walk-params                       ; unpack needed variables
  let uMin first s-bounds
  let uMax item 1 s-bounds
  let vMin item 2 s-bounds                             ; sbounds contains uw-min uw-max v-walk the screen location of the scale 
  let vMax item 3 s-bounds
  let vert vmin + 8 ;   &&&&                       ; put the scale in the bottom of the stage

  let p-bounds item 1 walk-params  
  let xMin first p-bounds                              ; p-bounds contains  xw-min yw-max the problem range of the scale
  let xMax item 1 p-bounds
  
  let tag-line item 2 walk-params
  
  let coef item 3 walk-params
  let m first coef        
  let c item 1 coef
  let nTics item 2 coef    ;the number of tics along the x-axis
  let Low item 3 coef      ;the starting x-value on the x-axis
  let Hi item 4 coef       ;the ending x-value on the x-axis
  
  let dxx (Hi - Low)/(Ntics - 1)                       ;  the distance between x-tics in problem coordinates
  let x Low
  repeat Ntics [
    create-scale-tics 1 [                              ; create the vertical tic lines by drawing down from the top
      set label precision x 3
      set heading 180                                  ; aim down
      set color gray set pen-size 2                
      setxy (m * x + c) vert 
      st
        ]
     set x x + dxx ]                                   ; at this point turtles are poised to descend from the top of the graph
   ask scale-tics [ pd fd ticLength]                   ; draws all the verticals at once 
   ask markers [                                       ; draw horiontal line
     setxy uMin vert
     set color white
     set pen-size 2
     set heading 90
     pd
     fd uMax - uMin
     pu ] 
   create-labels 1 [ ht setxy (umax + umin) / 2 vert - 5 set label tag-line st ]]
end

to-report ticMarks [zMin zMax targetNumber]
     ; Computes the scaling parameters.
     ; Inputs are:
     ;     the beginning of the scale
     ;     The end of the scale
     ;     The target number of tic marks in the scale
     ; returns Scaleinfo, a list. 
     ;    The first item is the beginning of the scale (rounded down to an even number)
     ;    The second item is the end of the scale (rounded up)
     ;    The third item is the actual interval
     ;    The fourth number of tics (differnet from nTics)
   if ( zMax < zMin ) [                       ; swap if in the wrong order
     let z zMax
     set zMax zMin
     set zMin z ]
      ; compute the target interval between scale divisions (tic marks) in problem coordinates.
      ; note that if there are N tic marks, there are N-1 intervals.
   let dz  (zMax - zMin) / (targetNumber - 1) ; the value of the interval for the target number of tics
   let y log dz 10                            ; compute the log base 10 of dz
   let a floor y                              ; round y down to the nearest smaller integer
   let z y - a                                ; z is the fractional part of the log
   let r 0
   ifelse z < .15                             ; if z is less than .15 set r to 1
     [set r 1]
     [ifelse z < .5                           ; otherwise if it is less than .5 set r to 2
        [set r  2]
        [ifelse  z < .85                      ; otherwise if it is less that .85 set r to 5
          [set r 5 ]                          ; and if all else fails, set r to 10
          [set r 10 ]]]                       ; r is the nearest 'nice' number to z: 1, 2, 5 or 10                        
   set dz  r * 10 ^ a                         ; dz is now the "corrected" tic interval
   let k floor (zMin / dz)                  
   let lowtic k * dz
   let ntics 1 + ceiling (zMax / dz ) - k     ; the actual number of tic marks
   let hitic lowtic + dz * (ntics - 1)  
   report (list lowtic hitic ntics)
end
   
to-report mcCoef [zMin zMax wMin wMax]        ; computes a and b coefficients to transform z-values into w-values
   let m (wMax - wMin)/(zMax - zMin)          ; use m*z + c to transform from z to w 
   let c  wMin - m * zMin
   report list m c
end 



;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;    Run Procedure       ;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to run-airbag ; computes and draws the position or velocity graphs of the airbag and dummy 
  ; first, stop if there is no question selected
  if what-is-your-goal? = "" and not omit-question? [
    ; "To continue, first pick a goal."
    ask messages with [ number = 0 ][st]   ; ask user to pick a question
    stop ]     ; go no farther until the user asks a question
  ; at this point, there will be a new run--begin the run  
  if run-number > 0 [update-run-data]  ; package up the variables used in analyzing student patterns
          ; it may seem odd to place this here, but it is only here that the code can know that the student is
          ;       done looking at the last run. We want to capture everything that the student
          ;       has done after the first run but before the next.... 
  setup-for-run   ; housekeeping. advances run-number, saves the-question, hids old data
                  ; locks the sliders, resets logging variables
                     
  ; Compute position, velocity, and acceleration for the actors
  ; the car follows an equation given by car-loc
  ; the dummy position is determined by solving F=ma for the pseudo force of the accelerated reference frame, 
  ;      the force of the airbag, and some damping that simulates the active response of the dummy. 
  
  ; declare and initialize variables used in the calculations 
  set x-bag 0   set v-bag 0  let a-dum 0         ; starting values (x-bag and v-bag are globals)
  let x-dum distance-to-steering-wheel           ; read the distance slider and set the dummy there
  let v-dum 0                                    ; start the dummy with zero velocity
  set a-max 0 let t-a-max 0                      ; will be used to calculate the maximum acceleration of the dummy
  let x-a-max 0 let v-a-max 0                    ; Used to store t, x, v of dummy at max acceleration
  set w 0  set w2 0                              ; globals used in drawing the lines between current and past dots. 0 is used for the first
  let stopped? false                             ; flag used to draw an icon when the car stops
  let t 0                                        ; initialize time
  let dt experiment-duration-in-sec / n-points        ; Controls the speed of the animation. 
  set dummy-crashed? false                             ; a flag that indicates that the dummy crashed into the steering wheel
  let d-bag airbag-size * dt / time-to-fill-bag  ; the amount the bag inflates each dt as it inflates but before contact
  
  while [t <= experiment-duration-in-sec][       ; begin the calculation loop
    if t >= t-car-stops and not stopped? [       ; test for the first step after the time that the car is stopped
      set stopped? true 
;      mark-stop-point                           ; place a mark on the graph showing where the car stopped
    ]                                     ; now calculate the real forces on the dummy
    set a-dum (bags-force t x-dum v-dum dt ) / dum-mass  ; the acceleration due to the force from the bag
    
    ifelse v-dum > 0 
      [set a-dum a-dum - dum-friction-right * v-dum / t-car-stops ]    ; add in some unitless 'friction' supplied by the dummy
      [set a-dum a-dum - dum-friction-left * v-dum / t-car-stops  ]    ; friction can be different depending on the direction of the dummy
    let real-a a-dum   ; the real acceleration is needed later
    if a-dum > a-max [set a-max a-dum]           ; track the maximum REAL acceleration    
    set a-dum a-dum + pseudo t                   ; add in the pseudo acceleration due to the accelerated reference system

    let v-old v-dum                                            
    ifelse dummy-crashed?                     ; a-dum is now the sum of these accelerations--apply a simple Euler solution for v and x
      [set v-dum 0]
      [set v-dum v-dum + a-dum * dt]
    set x-dum x-dum + v-dum * dt              ; at this point, the position and velocity of the bag and dummy are known
    if x-dum <= 0 [                           ; if the dummy hits the steering wheel (at x=0)
      if not dummy-crashed? [                 ; if this is the first time the dummy crashes
        let temp (0 - v-old) / dt             ; set a very high acceleration proportional to the speed of collision
        if temp > a-max [set a-max temp]
        set dummy-crashed? true 
        set x-dum 0 set v-dum 0 
        set real-a a-max]]
        

    update-data-series ( list t x-dum v-dum )
    update-dummy t x-dum v-dum real-a cyan       ; place the dummy and add a dot to the graph
    update-bag t gray                            ; place the bag and add a dot to the graph (the bag is gray--its graph is d-color)

    if slow-mo? [wait .2]                        ; slow down if the slow-mo? switch is true
    if t = 0 [ tick wait .5]                     ; pause once the initial location is shown
    set t t + dt 
    tick ]                                       ; update the screen. This is the end of one time step of dt
  
  set a-max-g (precision (a-max / 9.8) 1 )       ; compute the max acceleration in units of g
  ; save sliders and results for reports
  recolor-dummy-graph 
  
  ; save run data
  show-results          ; updates the output box and parameter graph for this run
  
  ; save the variables available at the end of the run for reporting. 
  ; later, these will be added to data about student use of analysis tools. 
  set temp-data (list car-speed distance-to-steering-wheel airbag-size time-to-fill-bag a-max-g dummy-status) 
  set temp-data sentence temp-data (list dummy-crashed? the-question slow-mo?)
  reset-timer ; begin timing how long the student analyzes data
  update-run-data                              ; this generates data for research that will be exported in the list run-data 

  ; now update RunSeries (used to generate student logs)
  update-run-series
  
  ; get ready for the next run
  set what-is-your-goal? ""
end

;::::::::::::::::::::::::::::::::::::::::::::::::::;;
;;;;;;;;; support for dynamics calcs  ;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to setup-for-run
  if run-number > 0  [update-run-data]
  set run-number run-number + 1 ; increment the run counter   
  set the-question what-is-your-goal?  ; save the question for this run
  if always-erase? [
    ask dots [ht]     ; remove all prior graphs 
    ask lines [set hidden? true]
    set pick-graphs "Last 1"
    set old-pick-graphs "Last"]
  ask messages [ht]
  let d-color cyan; the dummy and position and velocity lines are all cyan
  ask actors   [st]
  set variables-locked? true  ; used to stop any changes during a run
  set pick-y-axis "Position (m)"
  set old-pick-y-axis pick-y-axis
  set-y-axis 
  tick  
  
  set-times          ; computes   t-start-inflate The time at which the airbag starts inflating
                     ;            t-fully-inflated, the time at which the airbag is fully inflated
                     ;            t-car-stops, the time at which the car stops
                     
  ; there are a bunch of variables used in student logging that need to be initialized
  set used-slow-mo? slow-mo?          ; logical that is true if the slow-mo was used
  set run-groups-used []
  set used-cursor? false           ; logical that is true if the mouse ever entered the time-series graph
  set cursor-times 0            ; The number of times the mouse entered the time series graph area
  set was-in-grid? false
  set cursor-time 0            ; The total time the mouse was in the time-series graph
  set cursor-time-start 0     
  set used-pointer? false           ; true if the mouse ever entered the parameter graph
  set pointer-times 0         ; The number of times the mouse entered the parameter graph area
  set pointer-time 0           ; The total time the mouse was in the parameter graph area
  set hover-times 0           ; The number of times that the user hovered over a dot in the parameter graph area
  set hovering? false         ; true if the mouse is near a dot in parameter space
  set old-hovering?  false    ; true if hovering? was true last time through the execution loop
  set activity-counter 0
  set prior-runs-viewed [ ]
  ifelse vertical-axis-type = "Position (m)" ; type two is the velocity graph...
    [set graph-type-used (list 1)]
    [set graph-type-used (list 2)]
end

to recolor-dummy-graph   ; colors graph run-number red, yellow, or green depending on a-max
  ; also makes the dots larger for accelerations near a-max
  let c maybe-color
  if a-max-g < .9 * a-cutoff  [set c safe-color]  ; give a 10% margin 
  if a-max-g > 1.1 * a-cutoff  [set c unsafe-color]
  ; c is now the right color
  let max-list []
  ask dots with [run-n = run-number and color = cyan ][  ; select current bag points
    set color c                                          ; recolor the dots
    ; now change any dots that are at the maximum acceleration                         ; the real acceleration of this dot in mks units
;    if a-max = 0 [set a-max 1e-6]
    if (acceleration = a-max) [            ; if this dot is at the max acceleration, save its x-val and mark its a-max? flag
      set a-max? true
      set max-list lput x-val max-list ]]                             ; add a point to a list of x-coords of points with max acceleration
  ; now pick out the center of max-list to show a star representing the max acceleration
  if length max-list != 0 [
    let x-val-of-max item (round (length max-list) / 2) sort max-list
    ask dots with [x-val = x-val-of-max and run-n = run-number and color = c][
      set shape "star" set size 3]]      ; mark the maximum
  ask lines with [run-num = run-number and color = cyan][   ; recolor the lines
    set color c ]
end

to-report bags-force [t x-dum v-dum dt]          ; calculate the bag's dynamics: x-bag, v-bag, and the bag's force on the dummy given the dummy at x-dum
                                                 ;    x-bag and v-bag are globals. Only the force is reported, the other computed values are available as globals
  if dummy-crashed? or (shutoff-enabled? and not bag?) [set x-bag 0 set v-bag 0 report 0] 
    ; if the dummy has already crashed into the steering wheel or it is shut off... return a force of zero
  let penetrating? (x-dum <= x-bag)              ; if true the dummy has penetrated the bag  
  let inflating? t > t-start-inflate and t < t-fully-inflated ; iff t is between t-start-inflate and t-fully-inflated, set inflating? true
  ; handle the three times (before, during, and after inflation) separately
  
  if t <= t-start-inflate [                      ; if the bag has not yet started to inflate
    if penetrating? [set dummy-crashed? true]    ;    if there is penetration, the dummy has just crashed
    set x-bag 0 set v-bag 0 report 0 ]  
  
  if inflating? [                                ; if the bag and dummy are in contact and the bag is inflating
    set v-bag airbag-size / time-to-fill-bag     ; the bag continues to inflate
    set x-bag x-bag + v-bag * dt
    ifelse penetrating?                          ; if the dummy is penetrating the bag...
      [report stiffness-inflating * (x-bag - x-dum ) / penetration ] ; report a fraction of the inflating stiffness--can get large!
      [report 0 ]]                               ; there is no force if not in contact
  
  if t >= t-fully-inflated [                     ; if the bag has already inflated it can now deflate
    if penetrating? [                            ; if the dummy is inside the bag...
      ifelse (x-bag - x-dum) < penetration       ;    If the amount the dummy has gone into the airbag is less than penetration
        [ let f (stiffness-inflated * (x-bag - x-dum ) / penetration)  ; the force on the dummy is a fraction of the penetration 
          set v-bag -.017 * f / dum-mass          ;  let the airbag deflate at a fraction of the force 
          set x-bag x-bag + v-bag * dt             
          report f ]                             ; report the force on the dummy
        [ifelse x-bag > (x-dum + penetration)    ; if penetration reaches 'penetration' then the dummy pushes the airbag 
           [set v-bag v-bag - 20 * abs (x-bag - (x-dum - penetration))
            set x-bag x-bag + v-bag * dt ]              ; deflate quickly
           [set x-bag x-dum + penetration 
            set v-bag v-dum]
         if x-bag > airbag-size [
           set x-bag airbag-size
           set v-bag 0 ]
         report stiffness-inflated ]]            ; ... and the airbag pushes back with a force of 'stiffness inflated'
    if not penetrating? [                        ; if the airbag is inflated and the dummy is outside it...
      set v-bag 0                                ; .. let the airbag sit there and don't change its size
      report 0 ]]                                ;     and report no force on the dummy
end

to set-times         ; computes   t-start-inflate The time at which the airbag starts inflating
                     ;            t-fully-inflated, the time at which the airbag is fully inflated
                     ;            t-car-stops, the time at which the car stops
  
    set t-car-stops time-to-stop-going-40 * car-speed / 40   ; the time to stop the car after collision is proportional to speed. 
    if t-car-stops = 0 [ set t-car-stops 1e-6]
    set t-start-inflate t-delay
    set t-fully-inflated time-to-fill-bag + t-delay  ; 
end

to-report pseudo [t]
  let a-pseudo 0
  if (t-car-stops != 0) and (t < t-car-stops) [         ; the pseudo acceleration starts and stops smoothly starting at t=0 and ending at t-car-stops
       set a-pseudo (car-speed / t-car-stops) * (cos (360 * t / t-car-stops) - 1 )]
  report a-pseudo
end

to mark-stop-point        ; shows the time when the car stopped placing an icon on the time axis
  let trans last grid-params
  let xm first  trans let xc item 1 trans
  let ym item 2 trans let yc item 3 trans
  let x xm * t-car-stops + xc
  let y ym * max-y + yc  ; place on the top of the graph
  
  ask messages with [number = 1 ][ setxy x y - 5 st]  ; show the stop point
  ask messages with [number = 2 ][ setxy x + 10 y - 3 st] ; show the stop message
end

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;; airbag routines ;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to draw-graph ; draws a position or velocity graph depending on vertical-axis-type using existing dots
  ; dots are not changed
  set x-label "Time (s)"
  set y-label vertical-axis-type
  set min-x 0 
  set max-x experiment-duration-in-sec
  if vertical-axis-type = "Velocity (m/s)" [
    let temp v-range ; autoscale for velocity
    set min-y first temp
    set max-y last temp ]
  if vertical-axis-type = "Position (m)" [
    set min-y position-min
    set max-y position-max
    ]
  set-graph-scale  ; rescale the graph only, not the stage
  ask dots [ 
    ifelse vertical-axis-type = "Position (m)"  
      [place x-val y-val] 
      [place x-val velocity]]
end

to erase-graphs
  ask dots [ht]    
  ask messages [ht] 
  ask lines [set hidden? true]
  set enter-a-run-number 0
  tick
end

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;; graph output and display ;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
  
to update-dummy [t x-dum v-dum acc d-color]  ; places a point on the graph and puts the dummy on the stage
  ; its location and velocity--x-dum and v-dum--are globals
  create-dots 1 [          ; create a dummy graph dot for time=t
    set w1 who set a-max? false
    set shape "dot"
    set x-val t   ; x-val is a dot variable
    set y-val x-dum  ; y-val is another
    set velocity v-dum  ; and another  NOTE: the time series values are stored in the dots!!
    set acceleration acc
    set dot-color d-color
    set color d-color 
    set size 0                     ; the graphs are created by the lines between the dots, not the dots
    set run-n run-number 
    if vertical-axis-type = "Position (m)" [
      place t y-val ]     ; reads the dot's coordinates and places it in the graph, if the scale permits
    if vertical-axis-type = "Velocity (m/s)" [   
      place t velocity ]
    ifelse w > 0 [                ; connect the new dot with the prior one using a colored line, except for the first dot
      set prior-who w             ; used for reconnecting the lines in the graph--tells which dot to connect to. 
      create-line-with dot w [
        set thickness normal-thickness
        set run-num run-number
        set color d-color ]]
      [set prior-who 0]
    set w w1]
  ; finally, place the dummy in the stage
  draw-actor-on-stage 2 x-dum 0 d-color
  draw-actor-on-stage 3 x-dum 0 d-color
end

to update-bag [t d-color]  ; puts a point on the graph and places the bag
  ; the bag's color is gray 
  let screen-bounds first grid-params
  let vmin item 2 screen-bounds
  let vmax last screen-bounds
  create-dots 1 [ 
    set w3 who set a-max? false
    set x-val t 
    set y-val x-bag
    set velocity v-bag
    set dot-color 7   ; light grey
    set color dot-color
    set run-n run-number
    set size 0
    if vertical-axis-type = "Position (m)" [
      place t y-val ]     ; reads the dot's coordinates and places it in the graph, if the scale permits
    if vertical-axis-type = "Velocity (m/s)" [   
      place t velocity ]      ;  don't connect dots outside the graphing area. 
    ifelse w2 > 0 [                ; connect the new dot with the prior one using a colored line, except for the first dot
      set prior-who w2             ; used for reconnecting the lines in the graph--tells which dot to connect to. 
      create-line-with dot w2 [
        set thickness normal-thickness
        set run-num run-number
        set color 7 ]]
      [set prior-who 0]; used for reconstructing the graph lines. Zero indicates no line. 
    set w2 w3] 
    
  ; finally, place the airbag in the stage
  draw-actor-on-stage 1 (x-bag / 2) 0 white  ; its center is half of x-bag (the location of the front of the bag)
end

to draw-actor-on-stage [num x phi colr]  ; places actor num at x on the stage at heading phi
  ; actors can be distinguished using their variable 'number', which is 1 for the airbag, 2 for the body, 3 for the head

  let s-bounds first walk-params             ; extract the stage boundaries
  let umin first s-bounds
  let umax item 1 s-bounds
  let vmin item 2 s-bounds
  let vmax item 3 s-bounds
  let trans item 3 walk-params               ; extract the transformation coeficients 
  let m first trans
  let c item 1 trans
  
  let u m * x  + c                             ; convert x from problem coordinates to horizontal screen location
  let ave ( vmin + vmax ) / 2 
  let v ave + 9 ; this works for the dummy body
  if num = 1 [        ; for the airbag
    set v ave + 9 ]
  if num = 3 [        ; for the head
    set v 9 + ave - 3 * sin phi]  ; move the head down a bit if tilted

  ask actors with [number = num][ 
    ifelse in-stage? u v                 ; if u, v is in the stage.....
      [ st
        setxy u v                    ;    move the actor there
        if num = 1 [
          set size x * bag-mult     ; for the airbag....
          set color white]   
        if num = 3 [ ; the head
          set heading phi]
        if num != 1 [set color colr]  ; if not the airbag, set the color
      ]
      [ht]]                                   ;  if not in the stage, hide it.                     
end

to set-y-axis
  set vertical-axis-type pick-y-axis
;  ask dots [ht]
  draw-graph
  ifelse vertical-axis-type = "Position (m)" 
    [set graph-type-used lput 1 graph-type-used ]
    [set graph-type-used lput 2 graph-type-used ]  
end

to set-y-axis-velocity
  set vertical-axis-type "Velocity (m/s)" 
  ask dots [ht] 
  draw-graph
  if graph-type-used = 0 [set graph-type-used 2]    ; 2 will indicate that the user selected the velocity graph
  if graph-type-used = 1 [set graph-type-used 3] 
end

to-report v-range
  ; sorts through any data and sets the velocity range
  let v-max 10 let v-min -10 ; default values
  ask dots [
    if velocity > v-max [set v-max velocity]
    if velocity < v-min [set v-min velocity]]
  report list v-min v-max
end
  
to display-run [n]
  if n > 0 and n <= run-number [
    ask dots with [run-n = n ][st]
    ask lines with [run-num = n][ set hidden? false]
    set prior-runs-viewed lput n prior-runs-viewed  ; used in logging
    tick]
end

to display-runs-colored [clr]           ; displays only runs that have the color clr
  let i 1
  while [i <= run-number ][             ; go through all runs
    let c [color] of one-of dots with [run-n = i and color != 7]  ; the only way to get the color of run i
    if c = clr [                        ; if the color of this run is the desired color ...
      display-run i]
;      ask lines with [run-num = i ][    ; show the lines
;        set hidden? false ]
;      ask dots with [run-n = i][ st ]]  ; show the dots (most don't show, but the max-acceleration ones do)
    set i i + 1]
  tick
end

to set-graph-scale  ; reads the user-supplied ranges, labels, and units and sets the graph scales accordingly
  set max-x experiment-duration-in-sec
  let pb (list min-x max-x min-y max-y)
  set grid-params replace-item 1 grid-params pb
  set grid-params replace-item 2 grid-params list x-label y-label ; read the user labels and put them in the right place.
  draw-view    ; use the new parameters to draw the grid and scales 
end

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;  Collect and display meta-data ;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to update-run-data 
  ; collect all the data from the current run into a list and append that list to run-data
  ; called at the end of a run every time some subsequent student action is detected
  ; run-data is a list of lists, each of which is all the data from a run, stored in order of the runs
  ; Contents of each run's data:
  ;   0. car-speed 
  ;   1. distance-to-steering-wheel 
  ;   2. airbag-size 
  ;   3. time-to-fill-bag 
  ;   4. a-max-g (maximum acceleration in g units)
  ;   5. dummy-status (yes, no, maybe)
  ;   6. dummy-crashed? logical
  ;   7. the question selected by the student
  ;   8. slow-mo? Logical. True if the run ended with slo-mo? true
  ;   The variables above are computed at the end of the run and are stored as a list in current-run-data
  ;   The next set of variables are derived from user actions. This method is called every time one changes
  ;   9. duration of the anaysis, in seconds  ; timer is set to zero at the end of a run and read just before beginning the next 
  ;  10. prior-runs-viewed ( a list of run numbers viewed)
  ;  11. graph-type-used (a list consisting of 1s and 2s, 1 for position, 2 for velocity)
  ;  12. run-groups-used ( a list of the texts selected using the pick-graph function)
  ;  13. used-cursor? (true false) true if the mouse ever entered the time-series graph
  ;  14. cursor-times The number of times the mouse entered the time series graph area when only one graph was showing
  ;  15. cursor-time The total time the mouse was in the time-series graph in seconds when only one graph was showing
  ;  16. used-pointer? true if the mouse ever entered the parameter graph
  ;  17. pointer-times The number of times the mouse entered the parameter graph area
  ;  18. pointer-time The total time the mouse was in the parameter graph area
  ;  19. hover-times  The number of times that the user hovered over a dot in the parameter graph area
  ;  20. question-needed? True if the user tried to run or change sliders but had not entered a question
  ;  21. activity-counter. An overall measure of student interaction--the number of actions a student takes

  let current-run-data lput round timer temp-data    ; 9 temp-data stores the data on sliders etc. used in calculating the run
  set current-run-data lput prior-runs-viewed current-run-data    ; 10 prior-runs is a list, so needs to be tacked on separately
  set current-run-data lput graph-type-used current-run-data      ; 11
  set current-run-data lput run-groups-used current-run-data      ; 12
  set current-run-data lput used-cursor? current-run-data         ; 13
  set current-run-data lput cursor-times current-run-data         ; 14
  set current-run-data lput round cursor-time current-run-data    ; 15
  set current-run-data lput used-pointer? current-run-data        ; 16
  set current-run-data lput pointer-times current-run-data        ; 17
  set current-run-data lput round pointer-time current-run-data   ; 18
  set current-run-data lput hover-times current-run-data          ; 19
  set current-run-data lput question-needed? current-run-data     ; 20
  set current-run-data lput activity-counter current-run-data  ; 21
    ; at this point, current-run-data contains everything we want to know about the run and student analysis just updated
  set activity-counter activity-counter + 1 ; this is set to zero at the start of a run
;  show activity-counter
  update-inquiry-summary current-run-data
  if length run-data = run-number and run-number > 0  [  ; if run-data already has data from a previous update to this run
    set run-data bl run-data ]     ; remove the old data
  set run-data lput current-run-data run-data  ; substitute the more current run data in current-run-data
  set run-data-word (word run-data)
end

to show-results       ; generates a line of text in the output box and point in parameter space summarizing a run
  ; a-max-g the maximum acceleration experienced in g units, determines whether the dummy survives. 
  set dummy-status "Maybe"
  if a-max-g < .95 * a-cutoff  [set dummy-status "Yes"]  ; give a 10% margin 
  if a-max-g > 1.05 * a-cutoff  [set dummy-status "No"]
  
  output-type (pad (word run-number) 6)  ; 'pad' ensures that the same number of characters + spaces are used
  
  output-type pad dummy-status 7
  
  let temp word a-max-g "g"   ; max acceleration in g units
  output-type pad temp 10
  
;  set temp word car-speed " m/s"
;  output-type pad temp 11
   
;  set temp word distance-to-steering-wheel " m"
;  output-type  pad temp 10
  
  set temp word airbag-size " m"
  output-type pad temp 10
  
  output-print word time-to-fill-bag " s" 
  
  ; finally, create one dot2 for the parameter graph
  if parameter-graph? [
  create-dots2 1 [
    set color unsafe-color
    if dummy-status = "Maybe" [set color maybe-color]
    if dummy-status = "Yes" [set color safe-color]
    set label-color color
    set car car-speed
    set dist distance-to-steering-wheel
    set bag-size airbag-size
    set bag-time time-to-fill-bag
    set label word run-number "      " ; put a space before the text
    ifelse shutoff-enabled? 
      [ifelse bag? 
        [set shape "Open Box" set size 5]
        [set shape "X" set size 5 ]]

      [set shape "dot" set size 5 ]
    place2 (p-value horizontal-axis) (p-value vertical-axis)]] ;show the new dot
end

to-report pad [txt n]; Pads out the text txt to be n spaces long, putting spaces after the txt. Useful in lining up text in the output box
  let k length txt ; find out how long txt is TXT MUST BE A TEXT STRING
  if k >= n [report txt] ; if txt is too long, just return txt
  repeat n - k [set txt word txt " "]  ; add k-n spaces
  report txt
end

to leave     ; used when exiting this model
;  update-run-data      ; adds the final run's data to run-data
  set run-data fput (list date&time filename) run-data     ; stick the date and time at the end of run-data (this is a kind of ID for the series of runs)
  set run-data-word (word run-data)  ; the final data is converted into text
;  munch      ; goes through run-data looking for patterns and generates a report.
end 

to munch      ; computes and reports patterns from run-data
  ; right now, the resulting report is in the output box, but much could be a separate program that has run-data as its input
  ; run-data has a list of date and time and program filename as its first element. 
  ; Strip it out (I do this so that EVERYTHING is in run-data -- so it could be stored and munched outside this program.)
  ;  set date&time first first run-data
  let rd bf run-data 
  ; rd (a working version of run-data is now a list of lists each containing the following data of a run 
  ;  (the run number is the position of the data in the list) (item + 1)
  
  let ident first run-data  ; save identifiers
  output-print (word "Report     " first ident "  Code: " last ident )
  output-print word "Number of runs: " length rd
  
  ; first, get the range of values used for each variable 
  let car-min 2 let car-max 40    
  let dist-min .1 let dist-max .5 
  let size-min .2 let size-max .5 
  let time-min .01 let time-max .03   ; note, this is the range of the time for the airbag to fill
  
  let n-boundaries 0
  let car-values []  let dist-values [] 
  let size-values [] let time-values []
  let duration 0
  while [not empty? rd ] [
    let temp first rd      ; get the data for a run
    set car-values lput first temp car-values         ; collect all the car-speed values into a list
    set dist-values lput item 1 temp dist-values      ;    ditto for distance values
    set size-values lput item 2 temp size-values      ;    and airbag size values
    set time-values lput item 3 temp time-values      ;    and time-to-fill values
    set duration duration + item 9 temp               ; sum up the durations of each run
    set rd bf rd ]   ; chop off the first list and repeat
  output-print (word "Total time: " round duration " sec")
  
  let sorted-car-values  sort remove-duplicates car-values    ; sort the values and remove duplicates
  let sorted-dist-values sort remove-duplicates dist-values
  let sorted-size-values sort remove-duplicates size-values
  let sorted-time-values sort remove-duplicates time-values
  let smallest-car  first sorted-car-values           ; find the smallest value used
  let largest-car    last  sorted-car-values           ;      and the largest
  let smallest-dist first sorted-dist-values
  let largest-dist  last  sorted-dist-values
  let smallest-size first sorted-size-values
  let largest-size  last  sorted-size-values
  let smallest-time first sorted-time-values
  let largest-time  last  sorted-time-values
  if smallest-car  <= car-min  [set n-boundaries n-boundaries + 1]   ; see whether the smallest and larest are boundary values
  if largest-car   >= car-max  [set n-boundaries n-boundaries + 1]
  if smallest-dist <= dist-min [set n-boundaries n-boundaries + 1]
  if largest-dist  >= dist-max [set n-boundaries n-boundaries + 1]
  if smallest-size <= size-min [set n-boundaries n-boundaries + 1]
  if largest-size  >= size-max [set n-boundaries n-boundaries + 1]
  if smallest-time <= time-min [set n-boundaries n-boundaries + 1]
  if largest-time  >= time-max [set n-boundaries n-boundaries + 1]
  let car-range  round (largest-car  - smallest-car) 
  let dist-range precision (largest-dist - smallest-dist) 2
  let size-range precision (largest-size - smallest-size) 2
  let time-range precision (largest-time - smallest-time) 3
  let n-cars length sorted-car-values        ; the number of unique values of car speed
  let n-dist length sorted-dist-values       ;     ditto for distance-to-steering-wheel 
  let n-size length sorted-size-values       ;     and for airbag size
  let n-time length sorted-time-values       ;     and time-to-fill values
  
  output-print word "Total number of boundaries: " n-boundaries
  output-print "For 'Car-speed':"
  output-print word "   Values examined: " sorted-car-values
  output-print word "   Range: " car-range
  output-print word "   Number of unique values: " n-cars
  output-print "For 'Distance-to-steering-wheel':"
  output-print word "   Values examined: " sorted-dist-values
  output-print word "   Range: " dist-range
  output-print word "   Number of unique values: " n-dist
  output-print "For 'Airbag-size':"
  output-print word "   Values examined: " sorted-size-values
  output-print word "   Range: " size-range
  output-print word "   Number of unique values: " n-size
  output-print "For 'Time-to-fill-bag':"
  output-print word "   Values examined: " sorted-time-values
  output-print word "   Range: " time-range
  output-print word "   Number of unique values: " n-time  
  output-print ""
 
 ; now show results for each run
 let i 0
 set rd bf run-data
 while [i < length rd ][
   output-print word "\n For run: " (i + 1)
   let current-run item i rd
 
   output-print word  "   Dummy survived?       " (item 5 current-run)
   output-print word  "   Dummy crashed:        " (item 6 current-run)  
   output-print word  "   The question:         " (item 7 current-run)    
   output-print word  "   Slow-mo used:         " (item 8 current-run)   
   output-print (word "   Time analyzing:       " (item 9 current-run)  " s")

   output-print word  "   Prior graphs viewed:  " (item 10 current-run)
   output-print word  "   Y-axes used:          " (item 11 current-run)
   output-print word  "   Run groups used:      " (item 12 current-run)  
   output-print word  "   Used cursor?:         " (item 13 current-run)  
   output-print (word "   Cursor entered grid:  " (item 14 current-run) " times") 
   output-print (word "   Time cursor in grid:  " (item 15 current-run) " s")
   output-print word  "   Used pointer:         " (item 16 current-run)   
   output-print (word "   Pointer entered grid: " (item 17 current-run) " times")
   output-print (word "   Time pointer in grid: " (item 18 current-run) " s") 
   output-print word  "   Hover times:          " (item 19 current-run)  
   output-print word  "   Reminders needed:     " (item 20 current-run)
   output-print word  "   Activity level:       " (item 21 current-run)  

   set i i + 1 ]
 output-print ""
  
 output-print "Summary of slider values"
 output-print " (the order is car speed, distance to wheel, airbag size, and time to fill bag)"
 set i 0
 while [i < length rd ][
   output-type word "  Run: " pad (word (i + 1)) 3
   let current-run item i rd
   output-type pad (word (item 0 current-run )) 4
   output-type pad (word (item 1 current-run )) 6
   output-type pad (word (item 2 current-run )) 6
   output-type pad (word (item 3 current-run )) 7
   output-print item 5 current-run
   set i i + 1 ]
end 
  
to further-analysis     ; not yet implemented....
  ; 1 car speed
  ; 2 distance from steering wheel
  ; 3 airbag size
  ; 4 time to fill bag
  let correct-variables []
  if the-question = "Just exploring" [set correct-variables [1 2 3 4] ]
  if the-question = "What is the safe range of driver distances?" [set correct-variables [2] ]
  if the-question = "What is the safe range of collision speeds?" [set correct-variables [1] ]  
  if the-question = "What range of driver distance and collision speeds represent the 'danger zone'?" [set correct-variables [1 2]]
  if the-question = "What makes more difference for the driver’s safety: driver height or collision speed?" [set correct-variables [1 2]]
  if the-question = "What airbag deployment distance best keeps short drivers safe?" [set correct-variables [2]]
  if the-question = "What airbag deployment distance best keeps tall drivers safe?" [set correct-variables [2]]
  if the-question = "What airbag deployment time best keeps drivers safe in high speed collisions?" [set correct-variables [2 4]]
  if the-question = "What airbag deployment time best keeps drivers safe in low speed collisions?" [set correct-variables [1 4]]
  
  ; now look at successive pairs of values
  let cov [0 0 0 0]          ; this list will count the number of times only one variable was changed
  let repeats 0
  let rd run-data
  while [length rd > 1] [   ; at least one pair of runs is needed
    let current-run sublist (item 1 rd) 0 4                ; current-run is a list of the first four values for the curent run
    let old-run sublist (first rd ) 0 4                    ; ditto for the run before--the old run
    let match same? current-run old-run                    ; generates a list of 4 values: 0 if the two corresponding elements are the same, 1 otherwise
    let changes reduce + match                             ; changes is the number of variables changed
    if changes = 0 [set repeats repeats + 1]               ; if nothing was changed, then increment the number of repeats
    if changes = 1 [                                       ; if only one variable was changed....
      if non-zero current-run = non-zero old-run []
      
    ]
      
;      set cov mult-lists match (sum-lists match cov) ]     ;    compute a new CoV list. addition adds one to the right variable, multiplication zeros out those not changed
    if changes > 1 [set cov [0 0 0 0] ]                     ; if two variables were changed, reset CoV. 
    set rd bf rd ]                                         ; chop off the first run, get ready to process the next pair
end
  
to-report same? [list1 list2]  ; goes through the two lists looking for numerical differences in the elements
  ; reports a list of elements. For each item 1 means list elements are different or 0 means that the two are identical
  let list3 [ ]  let i 0 
  while [i < length list1][
    ifelse (item i list1) = (item i list2)
      [set list3 lput 1 list3]
      [set list3 lput 0 list3]
    set i i + 1 ]
  report list3
end

to-report non-zero [list1]
  let i 0
  while [i < length list1 ][
    if (item i list1) != 0 [report i]
    set i i + 1 ]
  report -1
end


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;; parameter graph routines  ;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to draw-graph2   ; parameter space grapher
  ask horizontals2 [die]
  ask verticals2 [die]
  let b2 first grid2-params
  let p2-bounds get-param-bounds                          ; gets bounds for the physical values, but for the parameter graph--depends on the variables being graphed
  set grid2-params (list b2 p2-bounds list horizontal-axis vertical-axis 0)    

  
  scale-grid2      ; fixes grid2-params for the the axes selected
  draw-grid2       ; draws the grid using grid2-params
;  draw-view
  ; now place the dots at the right positions on this graph, using the problem-space coordinates that they each store
  ask dots2 [place2 (p-value horizontal-axis) (p-value vertical-axis)] 
end
    
to-report get-param-bounds
  ; makes a list: Min-x Max-x Min-y Max-y for the parameter grid maker             ; all these are set by the user with input boxes
  let temp min-max horizontal-axis                 ; use the selector horizontal-axis to select the right range using the reporter bounds
  report sentence temp (min-max vertical-axis)  ; merge the vertical scale into a single list
end
  
to-report min-max [name] ;
  if name = "Car speed" [report list 0 40 ]
  if name = "Distance to steering wheel" [report list .1 .5]
  if name = "Airbag size" [report list .2 .5]
  if name = "Time to fill bag" [report list 0 .05]
end
    
to scale-grid2    ; Completes the grid2-params by supplying the transform coeficients
  ; the input to this is grid2-params but without transform coef
  ; this routine needs grid2-params to contain the correct screen-bounds problem-bounds and label list
  ; screen-bounds are uMin2  uMax2  vMin2  vMax2 which define the graphing window; tic marks and labels are drawn outside this
  ; problem-bounds are xMin2 xMax2 yMin2 yMax2
  ; the x, y coordinates are the problem coordinates 
  
  ; For each axis, this program generates the best scale minimum and maxium 
  ;     and the best number of tic marks
  ; From these, it calculates the problem-to-screen transformations which are reported out

  let screen-bounds first grid2-params
  let p2-bounds get-param-bounds                          ; gets bounds for the physical values, but for the parameter graph--depends on the variables being graphed
  set grid2-params (list screen-bounds p2-bounds list horizontal-axis vertical-axis 0)    

  let umin first screen-bounds
  let umax item 1 screen-bounds
  let vmin item 2 screen-bounds
  let vmax last screen-bounds
  
  let problem-bounds item 1 grid2-params
  let xmin first problem-bounds
  let xmax item 1 problem-bounds
  let ymin item 2  problem-bounds
  let ymax last  problem-bounds
  
  let b2 first grid2-params

  
  let xTarget ( umax - umin ) * patch-size / grid-separation       ;  sets the target number of tics based on the size of the graphing area
                                                      ;  allocates about grid-separation pixels per tic
  let a ticMarks xMin xMax xTarget                    ; a now contains xlow, xhi, and ntics
  let xLow first a                                    ; unpack a
  let xHi first but-first a
  let xNTics last a    
  set a mcCoef xLow xHi uMin uMax                     ; get the transform pair m, c for u = mx + c
  let xm first a
  let xc last a

  let yTarget ( vmax - vmin ) * patch-size / grid-separation      
  set a ticMarks yMin yMax yTarget                    ; a now contains ylow, yhi, and ntics
  let yLow first a                                    ; unpack a
  let yHi item 1 a
  let yNTics last a
  set a mcCoef yLow yHi vMin vMax                     ; get the transform pair m, c
  let ym first a
  let yc last a
  let trans (list xm xc ym yc xNTics yNTics xLow xHi yLow yHi)
  set grid2-params replace-item 3 grid2-params trans    ; update grid-params
end
 
to draw-grid2      ; actually draws the grid
  ; unpack the parameters needed from grid-params
  ; xLow xHi yLow yHi xntics yntics xm xc vmax vmin xlabel

  let screen-bounds first grid2-params
  let umin first screen-bounds
  let umax item 1 screen-bounds
  let vmin item 2 screen-bounds
  let vmax last screen-bounds
  
  let problem-bounds item 1 grid2-params
  let xmin first problem-bounds
  let xmax item 1 problem-bounds
  let ymin item 2  problem-bounds
  let ymax last  problem-bounds
  
  let ll item 2 grid2-params
  
  let coef item 3 grid2-params
  let xm first coef        
  let xc item 1 coef
  let ym item 2 coef
  let yc item 3 coef
  let xNTics item 4 coef    ;the number of tics along the x-axis
  let yNTics item 5 coef    ;the number of tics along the y-axis
  let xLow item 6 coef      ;the starting x-value on the x-axis
  let xHi item 7 coef       ;the ending x-value on the x-axis
  let yLow item 8 coef      ;the starting y-value on the y-axis 
  let yHi item 9 coef       ;the ending y-value on the y-axis

  let dxx (xHi - xLow)/(xNtics - 1)                     ;  the distance between x-tics in problem coordinates
  let x xLow
  repeat xNtics [
    create-verticals2 1 [                               ; create the vertical lines  by drawing down from the top
      set label precision x 3
      set label-color text2-color
      set heading 180                                  ; aim down
        ifelse x = xLow or x = xHi 
          [set color grid2-color set pen-size 2 ]            ; for the edges!
          [set color grid2-color set pen-size 1 ]             ; for the inside lines
        setxy (xm * x + xc) vmax 
        ]
     set x x + dxx ]                                     ; at this point turtles are poised to descend from the top of the graph
  ask verticals2 [ pd fd vmax + ticLength - vmin         ; draws all the verticals at once 
    pu fd 2 lt 90 fd 1 set size 0]
  ask labels2 [die]
  create-labels2 1 [
    set label first ll
    set label-color text2-color
    setxy .5 * (uMin + uMax) + .4 * length label vMin - 5.5
    set size 0]

  let dyy (yHi - yLow)/(yNtics - 1)                     ;  the distance between y-tics in problem coordinates
  let y yLow
  repeat yNtics [
    create-horizontals2 1 [                               ; create the vertical lines  by drawing left from the right
      set label precision y 3
      set label-color text2-color
      set heading 270                                  ; aim left
        ifelse y = yLow or y = yHi 
          [set color grid2-color set pen-size 2 ]            ; for the edges!
          [set color grid2-color set pen-size 1 ]             ; for the inside lines
        setxy umax (ym * y + yc) ]
     set y y + dyy ]                                     ; at this point turtles are poised to descend from the top of the graph
  ask horizontals2 [ pd fd umax + ticLength - umin         ; draws all the horizontals at once 
    pu fd .3 lt 90 fd .5 set size 0 ]
  create-labels2 1 [
    set label last ll
    setxy uMin + 1.15 * length label - 5 vMax + 3
    set label-color text2-color set size 0 ]
end

to place2 [x y]   ; in dot context, places the current dot on screen2 using x,y in the graph defined by grid2-params
  if not parameter-graph? [stop]
   ; controls the color, shape, and turns the dot on
   ; It makes little arrowheads pointing in the right direction if (x-val, y-val) is outside the graphing area. 
   ; points are grey if not selected and tiny if removed  
   ; first, unpack the parts of graph-params that are needed
   let trans item 3 grid2-params
   let mx first trans 
   let cx item 1 trans
   let my item 2 trans
   let cy item 3 trans
   
   let u mx * x + cx                        ; the horz screen coordinate of the x-value
   let v my * y + cy                        ; the vertical screen coordinate of the y-value
     let done? false                              ; u and v might be off-grid, in which case the dot shows up as an
     setxy u v                                    ; move the turtle to the point u,v
     st
;   ]
end 


;;;
;;; Start of data-export methods
;;;
;;; *** setup-data-export
;;;
;;; Structure definitions for setup-data-export method:
;;;
;;; computational-inputs
;;;   label, units, min, max, visible
;;;
;;;   label: string
;;;   units: string
;;;   min: number
;;;   max: number
;;;   visible: boolean
;;;
;;;   alternate form when value of units is "categorical"
;;;   label units [categorical-type1 categorical-type2 ...]  visible
;;;
;;; computational-outputs
;;;   label, units, min, max, visible
;;;
;;;   label: string
;;;   units: string
;;;   min: number
;;;   max: number
;;;   visible: boolean
;;;
;;; student-inputs
;;;   label, unit-type
;;;
;;;   label: string
;;;   unit-type: string
;;;
;;; model-information
;;;   name, filename, version
;;;
;;; time-series-data (an array of lists)
;;;   label, units, min, max
;;;
;;; Edit setup-data-export and call when your model is setup
;;;

to setup-data-export
  let computational-inputs [
    [ "Distance to steering wheel" "m" 0.1 0.5 true ]
    [ "Car speed" "m/s" 0 40 true ]
    [ "Airbag size" "m" 0 0.5 true ]
    [ "Time to fill bag" "s" 0.01 0.05 true ] ]
  let representational-inputs [
    [ "Slow Motion" "categorical" [ "true" "false" ] true ] ]
  let computational-outputs [
    [ "Maximum acceleration" "g" 0 200 true ]
    [ "Dummy Survival" "categorical" [ "Yes" "No" "Maybe"] true ] ]
  let student-inputs [
    [ "Goal" "categorical" ] ]
  let model-information [
    [ "airbags" "airbags.v19b-include-modular.nlogo" "v19b-include-modular" ] ]
  let time-series-data [
    [ "Time" "s" 0 0.1 ]
    [ "Position" "m" 0 0.6 ]
    [ "Velocity" "m/s" -10 10 ]
  ]
  let setup (list computational-inputs representational-inputs computational-outputs student-inputs model-information time-series-data)
  data-export:initialize setup
end

;;;
;;; update-run-series
;;;
;;;    pass in any needed values as arguments if they are not accessible as global variables
;;;

to update-run-series
  let computational-inputs    ( list distance-to-steering-wheel car-speed airbag-size time-to-fill-bag )
  let representational-inputs ( list slow-mo? )
  let computational-outputs   ( list a-max-g dummy-status )
  let student-inputs          ( list the-question )
  let run-series-data ( list computational-inputs representational-inputs computational-outputs student-inputs )
  data-export:update-run-series run-series-data
end

;;;
;;; update-data-series [ data-series ]
;;;
;;;    pass in any needed values as arguments if they are not global variables
;;;

to update-data-series [ data-series ]
  data-export:update-data-series data-series
end

;;;
;;; update-inquiry-summary [ data-series ]
;;;
;;;    pass in any needed values as arguments if they are not global variables
;;;

to update-inquiry-summary [ data-series ]
  data-export:update-inquiry-summary data-series
end


;;;
;;; end of data-export methods
;;;

to initialize-author-tools
  set slow-mo? false
  set grid-x-Color black   ; the color of the grid in the main graph for the position graph
  set back-x-Color white   ; the color of the background in the main graph for the position graph
  set grid-v-Color black   ; the color of the grid in the main graph for the velocity graph
  set back-v-color  47     ; the color of the grid in the main graph for the velocity graph
  set grid2-color black 
  set back2-color 69.5
  set text-color black 
  set text2-color black
  set safe-color blue
  set maybe-color orange 
  set unsafe-color magenta
  set stiffness-inflating 50000
  set stiffness-inflated 50000
  set time-to-stop-going-40 .1
  set dummy-size "Normal Adult"
  set experiment-duration-in-sec .1
  set t-delay .01
  set a-cutoff 125
  set bag-mult 250
  set dum-friction-left .5
  set dum-friction-right 0
  set penetration .035
  set omit-question? false
  set always-erase? true
  set parameter-graph? false
  set shutoff-enabled? false
  set bag? true
  set vertical-axis "Time to fill bag"
  set horizontal-axis "Airbag size"
end

to safe-run
  set omit-question? true
  set car-speed 20
  set airbag-size .36
  set distance-to-steering-wheel .4
  set time-to-fill-bag .014
  run-airbag

end

to unsafe-run
  set omit-question? true
  set car-speed 14
  set airbag-size .40
  set distance-to-steering-wheel .4
  set time-to-fill-bag .018
  run-airbag
end  
@#$#@#$#@
GRAPHICS-WINDOW
234
10
1003
577
71
50
5.31
1
12
1
1
1
0
0
0
1
-71
71
-50
50
1
1
0
ticks
30.0

BUTTON
19
170
217
237
Run Model
run-airbag
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
9
46
221
79
Airbag-size
Airbag-size
0.1
.5
0.24
.02
1
m
HORIZONTAL

SLIDER
9
79
222
112
Time-to-fill-bag
Time-to-fill-bag
.01
.05
0.02
.002
1
sec
HORIZONTAL

TEXTBOX
64
255
189
315
10 m/s = 22 mph\n20 m/s = 45 mph\n30 m/s = 67 mph
11
0.0
1

INPUTBOX
61
474
182
534
Enter-a-run-number
0
1
0
Number

TEXTBOX
63
446
193
474
Enter a run number that you want graphed.
11
0.0
0

CHOOSER
439
12
1002
57
What-is-your-goal?
What-is-your-goal?
"" "Test a minimum or maximum value" "Make a small change from the last run" "Fill a gap in my results" "Do a controlled comparison" "Explore/other"
0

BUTTON
235
12
355
57
NIL
On/off
T
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

CHOOSER
32
387
212
432
Pick-Graphs
Pick-Graphs
"Last 1" "Last 3" "Last 10" "All" "None" "Blue Only (survived)" "Orange Only (maybe)" "Magenta Only (died)"
0

BUTTON
56
543
181
577
Hide All Graphs
Erase-graphs\nset pick-graphs \"None\"
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

CHOOSER
33
332
207
377
Pick-Y-Axis
Pick-Y-Axis
"Position (m)" "Velocity (m/s)"
0

OUTPUT
659
225
1002
574
12

TEXTBOX
668
59
998
223
NIL
11
0.0
0

TEXTBOX
767
89
917
107
Blue = survived
14
105.0
1

TEXTBOX
767
111
917
129
Orange = maybe
14
25.0
1

TEXTBOX
767
132
917
150
Magenta = died
14
125.0
1

TEXTBOX
697
194
996
212
acceleration survival limit = about 125 g
14
0.0
1

TEXTBOX
385
244
400
262
*
28
0.0
1

TEXTBOX
400
247
660
265
= point of driver's max acceleration
14
0.0
1

@#$#@#$#@
## WHAT IS IT?

This section could give a general understanding of what the model is trying to show or explain.

## HOW IT WORKS

This section could explain what rules the agents use to create the overall behavior of the model.

## HOW TO USE IT

This section could explain how to use the model, including a description of each of the items in the interface tab.

## THINGS TO NOTICE

This section could give some ideas of things for the user to notice while running the model.

## THINGS TO TRY

This section could give some ideas of things for the user to try to do (move sliders, switches, etc.) with the model.

## EXTENDING THE MODEL

This section could give some ideas of things to add or change in the procedures tab to make the model more complicated, detailed, accurate, etc.

## NETLOGO FEATURES

This section could point out any especially interesting or unusual features of NetLogo that the model makes use of, particularly in the Procedures tab.  It might also point out places where workarounds were needed because of missing features.

## RELATED MODELS

This section could give the names of models in the NetLogo Models Library or elsewhere which are of related interest.

## CREDITS AND REFERENCES

This section could contain a reference to the model's URL on the web if it has one, as well as any other necessary credits or references.
@#$#@#$#@
default
true
0
Polygon -7500403 true true 150 5 40 250 150 205 260 250

airplane
true
0
Polygon -7500403 true true 150 0 135 15 120 60 120 105 15 165 15 195 120 180 135 240 105 270 120 285 150 270 180 285 210 270 165 240 180 180 285 195 285 165 180 105 180 60 165 15

ambulance
false
0
Rectangle -7500403 true true 30 90 210 195
Polygon -7500403 true true 296 190 296 150 259 134 244 104 210 105 210 190
Rectangle -1 true false 195 60 195 105
Polygon -16777216 true false 238 112 252 141 219 141 218 112
Circle -16777216 true false 234 174 42
Circle -16777216 true false 69 174 42
Rectangle -1 true false 288 158 297 173
Rectangle -1184463 true false 289 180 298 172
Rectangle -2674135 true false 29 151 298 158
Line -16777216 false 210 90 210 195
Rectangle -16777216 true false 83 116 128 133
Rectangle -16777216 true false 153 111 176 134
Line -7500403 true 165 105 165 135
Rectangle -7500403 true true 14 186 33 195
Line -13345367 false 45 135 75 120
Line -13345367 false 75 135 45 120
Line -13345367 false 60 112 60 142

ant
true
0
Polygon -7500403 true true 136 61 129 46 144 30 119 45 124 60 114 82 97 37 132 10 93 36 111 84 127 105 172 105 189 84 208 35 171 11 202 35 204 37 186 82 177 60 180 44 159 32 170 44 165 60
Polygon -7500403 true true 150 95 135 103 139 117 125 149 137 180 135 196 150 204 166 195 161 180 174 150 158 116 164 102
Polygon -7500403 true true 149 186 128 197 114 232 134 270 149 282 166 270 185 232 171 195 149 186
Polygon -7500403 true true 225 66 230 107 159 122 161 127 234 111 236 106
Polygon -7500403 true true 78 58 99 116 139 123 137 128 95 119
Polygon -7500403 true true 48 103 90 147 129 147 130 151 86 151
Polygon -7500403 true true 65 224 92 171 134 160 135 164 95 175
Polygon -7500403 true true 235 222 210 170 163 162 161 166 208 174
Polygon -7500403 true true 249 107 211 147 168 147 168 150 213 150

arrow
true
0
Polygon -7500403 true true 150 0 0 150 105 150 105 293 195 293 195 150 300 150

arrow tool
true
0
Polygon -1 true false 150 150 120 210 150 195 180 210
Line -1 false 150 195 150 300

balloon
false
0
Circle -7500403 true true 73 0 152
Polygon -7500403 true true 219 104 205 133 185 165 174 190 165 210 165 225 150 225 147 119
Polygon -7500403 true true 79 103 95 133 115 165 126 190 135 210 135 225 150 225 154 120
Rectangle -6459832 true false 129 241 173 273
Line -16777216 false 135 225 135 240
Line -16777216 false 165 225 165 240
Line -16777216 false 150 225 150 240

baseball
false
0
Circle -7500403 true true 30 30 240
Polygon -2674135 true false 247 79 243 86 237 106 232 138 232 167 235 199 239 215 244 225 236 234 229 221 224 196 220 163 221 138 227 102 234 83 240 71
Polygon -2674135 true false 53 79 57 86 63 106 68 138 68 167 65 199 61 215 56 225 64 234 71 221 76 196 80 163 79 138 73 102 66 83 60 71
Line -2674135 false 241 149 210 149
Line -2674135 false 59 149 90 149
Line -2674135 false 241 171 212 176
Line -2674135 false 246 191 218 203
Line -2674135 false 251 207 227 226
Line -2674135 false 251 93 227 74
Line -2674135 false 246 109 218 97
Line -2674135 false 241 129 212 124
Line -2674135 false 59 171 88 176
Line -2674135 false 59 129 88 124
Line -2674135 false 54 109 82 97
Line -2674135 false 49 93 73 74
Line -2674135 false 54 191 82 203
Line -2674135 false 49 207 73 226

boat
false
0
Polygon -1 true false 63 162 90 207 223 207 290 162
Rectangle -6459832 true false 150 32 157 162
Polygon -13345367 true false 150 34 131 49 145 47 147 48 149 49
Polygon -7500403 true true 158 33 230 157 182 150 169 151 157 156
Polygon -7500403 true true 149 55 88 143 103 139 111 136 117 139 126 145 130 147 139 147 146 146 149 55

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

bus
false
0
Polygon -7500403 true true 15 206 15 150 15 120 30 105 270 105 285 120 285 135 285 206 270 210 30 210
Rectangle -16777216 true false 36 126 231 159
Line -7500403 false 60 135 60 165
Line -7500403 false 60 120 60 165
Line -7500403 false 90 120 90 165
Line -7500403 false 120 120 120 165
Line -7500403 false 150 120 150 165
Line -7500403 false 180 120 180 165
Line -7500403 false 210 120 210 165
Line -7500403 false 240 135 240 165
Rectangle -16777216 true false 15 174 285 182
Circle -16777216 true false 48 187 42
Rectangle -16777216 true false 240 127 276 205
Circle -16777216 true false 195 187 42
Line -7500403 false 257 120 257 207

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

circle
false
0
Circle -7500403 true true 0 0 300

circle 2
false
0
Circle -7500403 true true 0 0 300
Circle -16777216 true false 30 30 240

cow
false
0
Polygon -7500403 true true 200 193 197 249 179 249 177 196 166 187 140 189 93 191 78 179 72 211 49 209 48 181 37 149 25 120 25 89 45 72 103 84 179 75 198 76 252 64 272 81 293 103 285 121 255 121 242 118 224 167
Polygon -7500403 true true 73 210 86 251 62 249 48 208
Polygon -7500403 true true 25 114 16 195 9 204 23 213 25 200 39 123

dashed box
false
0
Rectangle -7500403 true true 0 0 15 45
Rectangle -7500403 true true 0 75 15 105
Rectangle -7500403 true true 0 135 15 165
Rectangle -7500403 true true 0 255 15 300
Rectangle -7500403 true true 0 285 45 300
Rectangle -7500403 true true 75 285 105 300
Rectangle -7500403 true true 195 285 225 300
Rectangle -7500403 true true 255 285 300 300
Rectangle -7500403 true true 0 0 45 15
Rectangle -7500403 true true 75 0 105 15
Rectangle -7500403 true true 195 0 225 15
Rectangle -7500403 true true 255 0 300 15
Rectangle -7500403 true true 285 0 300 45
Rectangle -7500403 true true 285 75 300 105
Rectangle -7500403 true true 285 195 300 225
Rectangle -7500403 true true 285 255 300 300
Rectangle -7500403 true true 120 120 180 135
Rectangle -7500403 true true 0 195 15 225
Rectangle -7500403 true true 135 0 165 15
Rectangle -7500403 true true 285 135 300 165
Rectangle -7500403 true true 135 285 165 300
Rectangle -7500403 true true 165 135 180 165
Rectangle -7500403 true true 120 165 180 180
Rectangle -7500403 true true 120 135 135 165

doctor
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

dot
false
0
Circle -7500403 true true 90 90 120

dummy-body
false
0
Rectangle -7500403 true true 135 180 195 300
Circle -7500403 true true 131 146 67

dummy-head
true
0
Circle -7500403 true true 116 71 67
Circle -7500403 true true 114 99 42
Polygon -7500403 true true 165 120 165 165 150 165 135 135

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

farmer
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

fish
false
0
Polygon -1 true false 44 131 21 87 15 86 0 120 15 150 0 180 13 214 20 212 45 166
Polygon -1 true false 135 195 119 235 95 218 76 210 46 204 60 165
Polygon -1 true false 75 45 83 77 71 103 86 114 166 78 135 60
Polygon -7500403 true true 30 136 151 77 226 81 280 119 292 146 292 160 287 170 270 195 195 210 151 212 30 166
Circle -16777216 true false 215 106 30

fish2
false
0
Polygon -7500403 true true 137 105 124 83 103 76 77 75 53 104 47 136
Polygon -7500403 true true 226 194 223 229 207 243 178 237 169 203 167 175
Polygon -7500403 true true 137 195 124 217 103 224 77 225 53 196 47 164
Polygon -7500403 true true 40 123 32 109 16 108 0 130 0 151 7 182 23 190 40 179 47 145
Polygon -7500403 true true 45 120 90 105 195 90 275 120 294 152 285 165 293 171 270 195 210 210 150 210 45 180
Circle -1184463 true false 244 128 26
Circle -16777216 true false 248 135 14
Line -16777216 false 48 121 133 96
Line -16777216 false 48 179 133 204
Polygon -7500403 true true 241 106 241 77 217 71 190 75 167 99 182 125
Line -16777216 false 226 102 158 95
Line -16777216 false 171 208 225 205
Polygon -1 true false 252 111 232 103 213 132 210 165 223 193 229 204 247 201 237 170 236 137
Polygon -1 true false 135 98 140 137 135 204 154 210 167 209 170 176 160 156 163 126 171 117 156 96
Polygon -16777216 true false 192 117 171 118 162 126 158 148 160 165 168 175 188 183 211 186 217 185 206 181 172 171 164 156 166 133 174 121
Polygon -1 true false 40 121 46 147 42 163 37 179 56 178 65 159 67 128 59 116

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

girl
false
0
Polygon -7500403 true true 225 180 240 210 225 225 210 195
Polygon -7500403 true true 75 180 60 210 75 225 90 195
Polygon -7500403 true true 225 180 240 210 225 225 210 195
Polygon -2064490 true false 120 195 180 195 210 285 195 300 165 300 150 300 135 300 105 300 90 285
Polygon -1 true false 180 90 195 90 240 195 210 210 180 150 180 195 120 195 120 150 90 210 60 195 105 90 120 90 135 105 150 165 165 105 180 90
Polygon -7500403 true true 177 90 150 150 123 90
Rectangle -7500403 true true 124 76 177 92
Circle -7500403 true true 110 5 80
Line -13345367 false 179 90 106 90
Line -16777216 false 152 158 150 211
Rectangle -16777216 true false 118 186 184 198
Circle -1 true false 139 143 9
Circle -1 true false 139 166 9
Rectangle -16777216 true false 117 164 121 186
Polygon -2674135 true false 120 90 105 90 117 160 120 195 150 195 150 150 120 90
Polygon -2674135 true false 180 90 195 90 186 161 180 195 150 195 150 150 180 90
Polygon -1184463 true false 150 0 195 15 210 60 210 75 180 90 180 60 180 30 150 15 150 0
Polygon -1184463 true false 150 0 105 15 90 60 90 75 120 90 120 60 135 30 150 15 150 0

hand tool
true
0
Circle -1 true false 120 135 30
Rectangle -1 true false 135 135 300 165
Circle -1 true false 195 165 30
Circle -1 true false 210 195 30
Circle -1 true false 225 225 30
Rectangle -1 true false 210 165 300 195
Rectangle -1 true false 225 195 300 225
Rectangle -1 true false 240 225 300 255

help
false
6
Rectangle -6459832 true false 60 75 255 225
Rectangle -10899396 true false 75 90 240 210
Polygon -7500403 true false 75 210 240 210 255 225 60 225
Polygon -1 true false 60 75 255 75 240 90 75 90
Rectangle -16777216 true false 120 105 135 195
Rectangle -16777216 true false 120 150 195 165
Rectangle -16777216 true false 180 105 195 195

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

mass
false
0
Rectangle -7500403 true true 120 -15 180 105
Rectangle -7500403 true true 0 105 300 195
Circle -16777216 true false 135 15 30

monster
false
0
Polygon -7500403 true true 75 150 90 195 210 195 225 150 255 120 255 45 180 0 120 0 45 45 45 120
Circle -16777216 true false 165 60 60
Circle -16777216 true false 75 60 60
Polygon -7500403 true true 225 150 285 195 285 285 255 300 255 210 180 165
Polygon -7500403 true true 75 150 15 195 15 285 45 300 45 210 120 165
Polygon -7500403 true true 210 210 225 285 195 285 165 165
Polygon -7500403 true true 90 210 75 285 105 285 135 165
Rectangle -7500403 true true 135 165 165 270

ok
false
11
Rectangle -6459832 true false 60 75 255 225
Rectangle -955883 true false 75 90 240 210
Polygon -7500403 true false 75 210 240 210 255 225 60 225
Polygon -1 true false 60 75 255 75 240 90 75 90
Circle -16777216 true false 90 120 60
Circle -955883 true false 99 129 42
Rectangle -16777216 true false 165 120 180 180
Polygon -16777216 true false 210 120 180 150 210 180 225 180 195 150 195 165 195 150 225 120 210 120

open box
false
0
Rectangle -7500403 true true 75 90 90 225
Rectangle -7500403 true true 75 75 210 90
Rectangle -7500403 true true 210 75 225 210
Rectangle -7500403 true true 90 210 225 225

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

pivot
true
0
Circle -7500403 true true 0 0 300
Circle -16777216 true false 86 86 127

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

rocket
true
0
Polygon -7500403 true true 120 165 75 285 135 255 165 255 225 285 180 165
Polygon -1 true false 135 285 105 135 105 105 120 45 135 15 150 0 165 15 180 45 195 105 195 135 165 285
Rectangle -7500403 true true 147 176 153 288
Polygon -7500403 true true 120 45 180 45 165 15 150 0 135 15
Line -7500403 true 105 105 135 120
Line -7500403 true 135 120 165 120
Line -7500403 true 165 120 195 105
Line -7500403 true 105 135 135 150
Line -7500403 true 135 150 165 150
Line -7500403 true 165 150 195 135

sarah
false
0
Polygon -2064490 true false 180 195 120 195 90 285 105 300 135 300 150 300 165 300 195 300 210 285
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
Polygon -13345367 true false 151 85 137 112 161 112
Polygon -1184463 true false 120 0 90 30 90 60 75 90 120 75 135 30 165 30 180 75 225 90 195 15 165 0 120 0

select tool
false
0
Line -1 false 150 0 150 105
Line -1 false 0 150 90 150
Line -1 false 150 195 150 300
Line -1 false 210 150 300 150
Circle -1 false false 135 135 30

sheep
false
0
Rectangle -7500403 true true 151 225 180 285
Rectangle -7500403 true true 47 225 75 285
Rectangle -7500403 true true 15 75 210 225
Circle -7500403 true true 135 75 150
Circle -16777216 true false 165 76 116

spider
true
0
Polygon -7500403 true true 134 255 104 240 96 210 98 196 114 171 134 150 119 135 119 120 134 105 164 105 179 120 179 135 164 150 185 173 199 195 203 210 194 240 164 255
Line -7500403 true 167 109 170 90
Line -7500403 true 170 91 156 88
Line -7500403 true 130 91 144 88
Line -7500403 true 133 109 130 90
Polygon -7500403 true true 167 117 207 102 216 71 227 27 227 72 212 117 167 132
Polygon -7500403 true true 164 210 158 194 195 195 225 210 195 285 240 210 210 180 164 180
Polygon -7500403 true true 136 210 142 194 105 195 75 210 105 285 60 210 90 180 136 180
Polygon -7500403 true true 133 117 93 102 84 71 73 27 73 72 88 117 133 132
Polygon -7500403 true true 163 140 214 129 234 114 255 74 242 126 216 143 164 152
Polygon -7500403 true true 161 183 203 167 239 180 268 239 249 171 202 153 163 162
Polygon -7500403 true true 137 140 86 129 66 114 45 74 58 126 84 143 136 152
Polygon -7500403 true true 139 183 97 167 61 180 32 239 51 171 98 153 137 162

square
false
0
Rectangle -7500403 true true 30 30 270 270

square 2
false
0
Rectangle -7500403 true true 30 30 270 270
Rectangle -16777216 true false 60 60 240 240

squirrel
false
0
Polygon -7500403 true true 87 267 106 290 145 292 157 288 175 292 209 292 207 281 190 276 174 277 156 271 154 261 157 245 151 230 156 221 171 209 214 165 231 171 239 171 263 154 281 137 294 136 297 126 295 119 279 117 241 145 242 128 262 132 282 124 288 108 269 88 247 73 226 72 213 76 208 88 190 112 151 107 119 117 84 139 61 175 57 210 65 231 79 253 65 243 46 187 49 157 82 109 115 93 146 83 202 49 231 13 181 12 142 6 95 30 50 39 12 96 0 162 23 250 68 275
Polygon -16777216 true false 237 85 249 84 255 92 246 95
Line -16777216 false 221 82 213 93
Line -16777216 false 253 119 266 124
Line -16777216 false 278 110 278 116
Line -16777216 false 149 229 135 211
Line -16777216 false 134 211 115 207
Line -16777216 false 117 207 106 211
Line -16777216 false 91 268 131 290
Line -16777216 false 220 82 213 79
Line -16777216 false 286 126 294 128
Line -16777216 false 193 284 206 285

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

train
false
0
Rectangle -7500403 true true 30 105 240 150
Polygon -7500403 true true 240 105 270 30 180 30 210 105
Polygon -7500403 true true 195 180 270 180 300 210 195 210
Circle -7500403 true true 0 165 90
Circle -7500403 true true 240 225 30
Circle -7500403 true true 90 165 90
Circle -7500403 true true 195 225 30
Rectangle -7500403 true true 0 30 105 150
Rectangle -16777216 true false 30 60 75 105
Polygon -7500403 true true 195 180 165 150 240 150 240 180
Rectangle -7500403 true true 135 75 165 105
Rectangle -7500403 true true 225 120 255 150
Rectangle -16777216 true false 30 203 150 218

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

ufo
false
0
Polygon -1 true false 0 150 15 180 60 210 120 225 180 225 240 210 285 180 300 150 300 135 285 120 240 105 195 105 150 105 105 105 60 105 15 120 0 135
Polygon -16777216 false false 105 105 60 105 15 120 0 135 0 150 15 180 60 210 120 225 180 225 240 210 285 180 300 150 300 135 285 120 240 105 210 105
Polygon -7500403 true true 60 131 90 161 135 176 165 176 210 161 240 131 225 101 195 71 150 60 105 71 75 101
Circle -16777216 false false 255 135 30
Circle -16777216 false false 180 180 30
Circle -16777216 false false 90 180 30
Circle -16777216 false false 15 135 30
Circle -7500403 true true 15 135 30
Circle -7500403 true true 90 180 30
Circle -7500403 true true 180 180 30
Circle -7500403 true true 255 135 30
Polygon -16777216 false false 150 59 105 70 75 100 60 130 90 160 135 175 165 175 210 160 240 130 225 100 195 70

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

wheelchair
false
0
Circle -7500403 true true 15 120 180
Circle -1 true false 45 150 120
Polygon -1 true false 75 120 90 195 165 195 180 255 195 225 180 195 105 195 90 120
Polygon -7500403 true true 75 30 105 195 180 195 225 285 285 255 270 240 240 255 195 165 135 165 105 45
Circle -7500403 true true 75 15 60
Polygon -1 true false 120 120 165 135 180 165 135 165 120 120 135 165
Rectangle -7500403 true true 120 120 195 135

x
false
0
Polygon -7500403 true true 195 75 225 105 105 225 75 195
Polygon -7500403 true true 75 105 105 75 225 195 195 225

@#$#@#$#@
NetLogo 5.0.3
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
