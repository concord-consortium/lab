; Harmonic Motion software
; SmartGraph started Sept 2010
; Bob Tinker

; Aug 25, 2012. IS_Harmonic_Motion_Model.V3.3
; Got the pivot placed correctly, finally. Bug fixes.
; Added automatic amplitude calculations

; The logic of the interface that exports data to DataGames has been simplified. It now works as follows: 
;   The user presses an "export data" button in external exporting software
;   This button is active only if the NetLogo logical DG-data-ready? is true, otherwise the button is gray.
;   The exporter software calls the NL method "export-data"
;   When DG-data-ready? is false (export-data does this when it is finished, which can take a second) the exporter reads the NL global DG-output 

; Aug 23: Tweeks. Generated different outputs for the pendulum and spring-mass. Moved UI elements

; Aug 22: Converted to forced harmonic motion by adding a movable pivot
; Also wrote some physical-to-screen and screen-to-physical coordinate transformations. I should retro fit these throughout.
; Earlier I wrote some general graph drawing routines that need to be retro-fitted. 

; Aug 21: Added output in Jason format for importation to DataGames
; Aug 20: Some adjustments, added start-from-center 
; Aug 19: Removed all extraneous code except force vectors
; Data and parameter values are read to disk as a first step in sending them to the DataGames display. 

; Aug 18 Converted to a modeler for InquiryScience
; For this application, only a model is needed--no data collection. Since one set of parameters will be run at a time, 
;    I was able to simplify the UI logic. Only one color (yellow) and one dataset.
; Renamed and rearranged the controls to match as closely as possible the separate data gathering tool.
; Because the data collector can generate data that are not centered on zero, I removed that assumption. 

; Aug 12. Corrected force values displayed by the cursor and vector. 
; The program now computes the approximate force from data. It uses f = a/m using the mass from the mass-in-grams slider. 
; Acceleration is estimated using a least-squares fit of the last five points to a quadratic. 
; Upgraded the numberical integration method from Euler's method to the half-step method. 
; Created one button that selects a region and zooms into it. 
; Fixed bugs in the pendulum software

; Aug 11: Added force scaling and labels to force vectors that show their value (since they are scaled)
; Also added a cursor to make it possible to read force values
; Made it possible to measure the period of any graph, except force. 

; Aug 10. Changed from equations for the motion of the models and then estimating the force, to using the Euler method of numerical approximations. 
; Also added a nice spring with 25 loops. 

; July 23. This version of SmartProbe shows both a model of a pendulum or spring and real data side-by-side.
; Since v2.0, a force vector has been added. 
; Made graphing dots smaller and connected them with colored lines. 
; Shifted from computing force using a five-point moving least-squares fit of the closed solution
;    to an integration algorithm. 
; Created springs.
; Should there be separate x and force graphs? Right now, the force is arbritrrily scaled. 

; March 10, 2012. Created a graphing fork starting with the smartgraph prototype. 
 
; The software keeps separate "problem coordinates" and "screen coordinates." 
; problem coordinates can be any size and range. They are designated by x and y
; screen coordinates must use screen (or patch) coordinates, designated by u and v
; screen coordinated must fit on the screen defined by (min-xcor, min-ycor) and (max-xcor, max-ycor)
; the 'stage' is where something can be moved by the user to generate a graph or by the software, animatting a graph
; The user can select any one of several actors to move, thus creating many possible stories.
; the stage can be vertical, horizontal, or absent. 
; Datasets are named by their color in a way that makes it trivial to add datasets by adding new colors in the pull-down lists. 
; The x,y values of data are saved in turtles called dots in x-val and y-val. Setuv converts these into screen coordinates and shows the resulting dots

globals [
  ; Two globals for communication with DataGames
  DG-output            ; the output string that DG needs
  DG-data-ready?       ; logical that says whether there are valid data ready to be exported
  DG-exported?         ; set to false when export-data starts, true when method is complete

  force-amplitude force-frequency
  
  grid-params ; see below
  walk-params ; see below
  N-points      ; the number of points in a dataset
  actor-size
  dot-size
  grid-separation
  selected-box  ; the boundary of the selection box
  min-x max-x min-y max-y  ; these used to be supplied directly by the user, they are computed
  actor-2
  force-color f-scale
  show-force?
  x-label y-label
  starting-position
  max-of-run min-of-run  ; used to calculate the maximum amplitude during a run


  stage-center      ; in screen coordinates
  pivot-center-v    ; the center around which the pivot moves--in screen coordinates
  pivot-center-y    ; the center around which the pivot moves--in problem coordinates
  pivot-displacement

  stage?        ; tells whether there is a stage
  dot0 dot1 dot2 dot3   ; the turtles that define the select box
  dpoints       ; the distance between points in problem coordinates
  period        ; the calculated value of the period in sec
  frequency     ; calculated from period, in cycles per minute
  pendulum-length-s  ; the length of the pendulum in screen coords used in the model graphics
  stage         ; contains "Vertical" or "Horizontal" or "None" for spring-mass, pendulum, or ? 
  w w1 w2 w3    ; used to store who-values between calls. Used to connect dots. 
  ]

breed [handles handle]           ; these are used to indicate handles that allow the user to move a sketched graph
breed [verticals]
breed [scale-tics]
breed [horizontals]
breed [labels]                   ; cannot use the singular--don't need it
breed [actors actor ]            ; these are the things that move. 
breed [dots dot]                 ; dots are the data points that are drawn on the screen
breed [markers marker]
breed [box-dots box-dot]
breed [arrowheads arrowhead]      ; used with vectors
breed [arrowtails arrowtail]      ; vector shafts are drawn from an arrowtail to a arrowhead.
breed [spring-ends spring-end]    ; invisible 
breed [cursors corsor]            ; will be a joined pair of points that create the cursor
breed [messengers messenger]          ; used for labels for intersection values of graphs with the cursor
breed [pivots pivot]

undirected-link-breed [shafts shaft] ; used for arrow shafts
undirected-link-breed [spring-parts spring-part]   ; used to make springs
undirected-link-breed [select-edges select-edge]   ; used with the 'select' function
undirected-link-breed [lines line]  ; used to connect dots on a graph
undirected-link-breed [cursor-lines cursor-line]  ; creates a cursor

dots-own [ x-val y-val selected? removed? dot-color]         ; each dot knows its problem coordinates (x-val and y-val) and whether it has been selected or removed.
      ; the dot-color is the usual color of the dot, but the actual color can be different if the dot is not selected. 
actors-own [number]
arrowheads-own [number]
arrowtails-own [number]
spring-ends-own [number u-fraction v-fraction] ; fractions determine the relative locations of the spring ends
spring-parts-own [spring-number]

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

to setup         ;called by the button of the same name
  ifelse DG-data-ready? 
     [if user-yes-or-no? "Erase your data without exporting?" [startup]]
     [startup]
end

to startup
  clear-all
  reset-ticks                                     ; clear everything
;  set observations "Enter here information about this run--what you changed, what your strategy was, what you noticed, or anything else that you want to save. "
  ; initialize globals   
  set DG-data-ready? false
  set force-frequency 0
  set force-amplitude 0
  set N-points 500          ; the number of points in each dataset
  set grid-separation 30    ; the target number of pixels between grid lines
  set actor-size  6         ; controls the size of actors
  set dot-size 2            ; sets the size of each dota point
  set stage "Vertical"
  if model-type = "Pendulum" [set stage "Horizontal"]    ; this is a legacy because the old code used "horizontal" and "vertical" for the two setups. 
  if model-type = "None" [set stage "None"]
  set min-x 0
  set max-x run-duration-in-sec ; a user input  
  set min-y center-position - amplitude   ; these replace user inputs for y-min and y-max
  set max-y center-position + amplitude 
  set stop? false
  set actor-2 "mass"
  set force-color red
  set show-force? false
  set x-label "time (s)"
  set y-label "   position (m)"
  set pivot-displacement 0
    
  create-box-dots 4 [ht set color violet set size dot-size set shape "dot"] ; used with the selector tool
  set dot0 box-dot 0  
  set dot1 box-dot 1
  set dot2 box-dot 2
  set dot3 box-dot 3
  ask dot1 [                     ; link these into a rectangle. 
    create-select-edge-with dot0
    create-select-edge-with dot2 ]
  ask dot3 [
    create-select-edge-with dot0
    create-select-edge-with dot2 ]  
  set stage? not (stage = "None")    ; stage tells whether there is any stage
  ask select-edges [set color violet set thickness .5]

  create-markers 1 [ht]                  ; use this for general-purpose drawing 
  ; create the actor that will be moved. Additional actors may be made later.
  if stage? [
    let c read-from-string graph-color 
    create-actors 1 [                                       
      set size actor-size set color c
      set number 2
      set shape actor-2 
      set heading 0 ht]]
    
  set w 0          ; create two hidden linked arrowheads and tails
  let a-size 4 ; sets the arrowhead size
  create-arrowheads 1 [ ht
    set size a-size set number 1 set label "Force"
    set w who]
  create-arrowtails 1 [ht set number 1
    create-shaft-with arrowhead w] 
  create-arrowheads 1 [ ht
    set size a-size set number 2 set label "Force"
    set w who]
  create-arrowtails 1 [ht set number 2
    create-shaft-with arrowhead w]
  ask shafts [set thickness .8 set color force-color]
    
  if stage = "Vertical" [create-spring 2 25]  ; create spring numner 2 with 25 loops but make it invisible
 
  ; get ready to draw grid by creating grid-params, which contains all the information needed to draw the grid


  let bounds layout         ; the screen boundarys for the screen and stage are set in the procedure "layout" which returns a list of two lists
  let s-bounds first bounds
  let sw-bounds last bounds
  let p-bounds (list Min-x Max-x Min-y Max-y)             ; all these are globals set by the user with input boxes
  let label-list (list  x-label y-label)
  set grid-params (list s-bounds p-bounds label-list 0)   ; this creates the grid-params, but with a place-holder for the transforms
      ;  this will not create a grid until "scale-grid" is called to create the actual scale and transforms which are held in the fourth item.                                   
          ;  "draw-view" calls "scale-grid" which completes the information in grid-params
  if stage? [
          ; get ready to draw stage scale by creating walk-params, which contains all the information needed to draw the walk scale
          ; The scale represents the distance the actors walk/drive                    
    let pw-bounds list min-y max-y  
    set walk-params (list sw-bounds pw-bounds y-label 0) ; this creates the walk-params, but with a place-holder for the transforms
          ; At thie point, walk-params is incomplete until scale-stage is called, because it lacks the transforms. 
          ; "draw-view" calls "scale-stage" which fills in these missing values
  ]
  draw-view ; creates everything in the view--all graphs and actors
    ; once executed, everything needed to draw the view is contained in grid-params and walk-params
    
  if stage = "Vertical" [                  ; for the spring-mass model, create a pivot--the thing that holds the upper end of the spring.
    set pivot-center-v .75 * max-pycor
    set pivot-center-y last convert-to-problem 0 0 pivot-center-v  ; convert the pivot center to problem coordinates
    create-pivots 1 [set shape "pivot" set size 4 
      set color read-from-string graph-color 
      setxy stage-center pivot-center-v]
    let y last convert-to-problem 0 0 min-y
    draw-actor-on-stage 2 y pivot-center-y 0]
    
  reset-ticks
end

to-report layout  ; uses the global 'stage' and the screen boundaries to locate the screen and stage
  ; three layouts are supported--a vertical stage, a horizontal one, or none. 
  ; data are return as a list of two elements. The first element is s-boundary for the grid and the second is s-boundary for the stage
  let edge 5         ; space allocated around the edges of the grid and stage where there is no scale
  let edge+ 12        ; space needed for scale
  let walk-width 4   ; the width of the vertical stage 
  if stage = "Horizontal" [set walk-width 8]  ; make it wider for the pendulum display
  ; note, button-size is used here, too, but had to be a global b/c it is used elsewhere

  if stage = "Vertical" [
    let uwMin min-pxcor + edge                        ; set screen locations for a vertical stage
    let uwMax uwMin + walk-width + 8
    let uMin uwMax + edge+
    let uMax max-pxcor - edge             
    let vMin min-pycor + edge+
    let vwMin vMin
    let vMax max-pycor - (20 + edge)                ; give extra room at the top
    let vwMax vMax 
    set stage-center .5 * (uwmax + uwmin)
    let s-b (list uMin uMax vMin vMax)
    set  selected-box s-b                          ; default selection box
    let sw-b (list uwMin uwMax vwMin vwMax)
    report list s-b sw-b ]
 
  if stage = "Horizontal" [                ; set screen locations for a horizontal stage                               
    let uMin min-pxcor + edge+                    
    let uwMin umin
    let uMax max-pxcor - edge
    let uwMax max-pxcor - edge 
    let vMin min-pycor + edge+
    let vwMax max-pycor - edge
    let vwMin vwMax - (walk-width + 2)
    let vMax vwMin - edge+
    set stage-center .5 * (vwmax + vwmin)
    let s-b (list uMin uMax vMin vMax)
    set selected-box s-b                          ; default selection box
    let sw-b (list uwMin uwMax vwMin vwMax)
    report list s-b sw-b ]
        
 if stage = "None" [       
   let umin min-pxcor + edge+                     ; set screen locations for no stage
   let uMax max-pxcor - edge
   let vMin min-pycor + edge+
   let vMax max-pycor - edge 
   let s-b (list uMin uMax vMin vMax)
   set  selected-box s-b                          ; default selection box
   report list s-b [ ]]

end

to draw-view
  clear-drawing                         ; gets rid of all turtle tracks (will be re-born)....
  ask horizontals [die]                 ;   the grid generators
  ask verticals [die]
  ask scale-tics [die]                  ;    and the tics
  ask dots [ht]                         ; hide all the dots and tags
  ask cursors [die]

  scale-grid                            ; update the transformation coefficients for the grid
  draw-grid                             ; draw the grid
  if stage? [
    scale-stage                         ; update the transformation coefficients for the walk scale
    draw-stage                          ; draw the walk (or stage) scale
    draw-actor-on-stage 2 (first item 1 walk-params) pivot-center-y 0  ]     ; place actor 2 at the bottom of the stage with no force
  ask dots [setuv]                      ; put the data on the new grid
  wait .2 ; needed b/c Logo seems to move the turtles in a separate thread that doesn't finish in time. 
end


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;; Model Code  ;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
            
to set-starting-position
  hide-vector 2
  if stage? and stage = "Vertical" [                                  ; if there is no stage, ignore this button 
    let cNum read-from-string graph-color     ; cNum is the color number used in Logo for the graph-color that the user selected
    ask actors  [if number = 2 [set color cNum ]]      ; the one to be moved needs to match the color of the graph  
    let sb first walk-params
    let umin first sb
    let umax item 1 sb
    let u stage-center             ;   
    let trans item 3 walk-params              ; extract the transformation parameters
    let m first trans                         ; these are the vertical transformation numbers for the walk
    let c item 1 trans 

    while [not mouse-inside?]  [ ]            ; do nothing until the user enters the view
    while [mouse-inside? ][                   ; once the mouse is inside, update the actor to the vertical position
      if mouse-down? [
        ask actors with [number = 2 and color = cNum ][
          set ycor mouse-ycor ]
        show-spring 2 7 u pivot-center-v mouse-ycor ; n cnum u-center v-top v-bottom. Use light gray. 
        tick wait .03 ]]]

  if stage? and stage = "Horizontal" [        ; if there is a stage and it is horizontal...
    let cNum read-from-string graph-color     ; cNum is the color number used in Logo for the graph-color that the user selected
    ask actors  [if number = 2 [set color cNum ]]      ; the one to be moved needs to match the color of the graph  
    let trans item 3 walk-params              ; extract the transformation parameters
    let m first trans                         ; these are the horizontal transformation numbers for the walk
    let c item 1 trans 
    let u 0
    while [not mouse-inside?]  [ ]            ; do nothing until the user enters the view
    while [mouse-inside? ][                   ; once the mouse is inside, update the actor to the vertical position
      if mouse-down? [
        ask actors with [number = 2 and color = cNum ][
          set xcor mouse-xcor ]
        tick
        wait .03 ]]]
end

to start-at-center
  hide-vector 2
  let cNum read-from-string graph-color     ; cNum is the color number used in Logo for the graph-color that the user selected
  ask actors  [if number = 2 [set color cNum ]]      ; the one to be moved needs to match the color of the graph  
  let sb first walk-params
  let umin first sb
  let umax item 1 sb
  let trans item 3 walk-params              ; extract the transformation parameters
  let m first trans                         ; these are the vertical transformation numbers for the walk
  let c item 1 trans 
  if stage? and stage = "Vertical" [                                  ; if there is no stage, ignore this button   
    let u stage-center  
    let v m * center-position + c    
    if in-stage? u v [        
      draw-actor-on-stage 2 center-position pivot-center-y 0  ;    
;      ask actors with [number = 2 and color = cNum ][
;        setxy u v ]
;        show-spring 2 7 u pivot-center-v v ; n cnum u-center v-top v-bottom. Use light gray. 
      ]]

  if stage? and stage = "Horizontal" [        ; if there is a stage and it is horizontal...
    let u m * center-position + c  
    let v stage-center
    if in-stage? u v [             ;    
      ask actors with [number = 2 and color = cNum ][
        setxy u v ]]]
  tick
end

to run-model                      ; run the model--called by a user button click
  if DG-data-ready? [
    if not user-yes-or-no? "Collect new data without exporting your old data?" [stop]]
  set DG-data-ready? false
  hide-vector 1 hide-vector 2

  let cnum read-from-string graph-color           ; read the color to be used for this run  
                                     
  ask actors with [number = 2] [set color cnum]
  ask dots with [dot-color = cnum] [die]
  ask dots with [color = force-color] [die]  ; it gets too confusing with multiple force graphs...
  
  ; get ready to integrate and display results
  set period 0 set frequency 0
  let mass .001 * mass-in-grams 
  let dt .03                     ; the integration step size in sec
  let t 0    reset-timer          ; start at t=0
  
  if stage = "Vertical" [
    let v [ycor] of one-of actors  ; find the vertical position at which the model-mass starts
    set starting-position last convert-to-problem 0 0 v  ; the starting position of the model is current position translated into the y-coordinate system
    let pos starting-position
    let force force-spring pos 0            ; the initial force in Nt--no velocity (assuming that the spring constant is in Nt/meter)
;    let f-max abs (max-y - min-y) / 4       ; the maximum length of the force vector in position units
;    set f-scale f-max / abs force           ; a scaling factor that converts the force to a size that fits on the graph
    add-position-point pos 0 cnum           ; place a dot on the graph for the initial position
;    add-force-point force  0                ; place a dot on the graph for the initial force
    draw-actor-on-stage 2 pos pivot-center-y force   ; draw mass, spring, and pivot
    let vel 0 
    let h 1000 * dt / mass-in-grams    
    set pos pos + .5 * vel * dt             ; move the position a half-step ahead
    set min-of-run pos set max-of-run pos  ; used to calculate the amplitude
    while [t <= run-duration-in-sec ][                ; repeat until t-max is reached
      if stop? [
        calculate-period
        set DG-data-ready? true
        set stop? false stop]             ; allows the user to abort a run
      set pivot-displacement force-amplitude * sin (6 * force-frequency * t )  ; that 6 is 360 degrees per cycle / 60 sec per minute
      let pivot-y pivot-center-y + pivot-displacement
      set vel vel + (force-spring pos vel) * h     ; jump velocity ahead to the end of the interval
      let pos-end pos + .5 * vel * dt
      set pos pos + vel * dt                       ; jump position from lagging by half to leading by half
      set force force-spring pos vel  ; calculate the new force
      set t t + dt 
      if pos > max-of-run [set max-of-run pos]
      if pos < min-of-run [set min-of-run pos]
    
      ; now update the graph, vector, mass, pivot, and spring
      add-position-point pos-end t cnum  
;      add-force-point force t
      draw-actor-on-stage 2 pos-end pivot-y force
;      if in-view? stage-center pivot-u [
;        ask pivots [setxy stage-center pivot-u]]
      ; if all this has been done in less than dt (in real time) idle so that the actor moves in real time
      while [timer - t < dt] [ ]  ; wait until dt has passed
      tick              ; update the screen and repeat
    ]]

  if stage = "Horizontal" [
    let u [xcor] of one-of actors with [number = 2] ; find the horizontal position at which the model-mass starts
    set starting-position last convert-to-problem 0 0 u  ; the starting position of the model is current position translated into the y-coordinate system
    let pos starting-position
    let force force-pend pos 0      ; the initial force in Nt--no velocity (assuming that the spring constant is in Nt/meter)
    let f-max abs (max-y - min-y) / 4       ; the maximum length of the force vector in position units
;    set f-scale f-max / abs force     ; a scaling factor that converts the force to a size that fits on the graph
    add-position-point pos 0 cnum              ; place a dot on the graph for the initial position
;    add-force-point force  0                    ; place a dot on the graph for the initial force
    draw-actor-on-stage 2 pos 0 force   

    let vel 0  let h dt / mass    
    set pos pos + .5 * vel * dt  ; position gets a half-step ahead. 
    set min-of-run pos set max-of-run pos  ; used to calculate the amplitude
    while [t <= Run-duration-in-sec ][  ; repeat until t-max is reached
      if stop? [set stop? false
        set DG-data-ready? true
        calculate-period stop]   ; allows the user to abort a run
      set vel vel + (force-pend pos vel) * h
      set pos pos + vel * dt
      let pos-end pos - .5 * vel * dt
      set force force-pend pos vel  ; calculate the new force
      set t t + dt 
      if pos > max-of-run [set max-of-run pos]
      if pos < min-of-run [set min-of-run pos]
    
      ; now update the graph, vector, and model
      add-position-point pos-end t cnum  
;      add-force-point force t
      draw-actor-on-stage 2 pos-end 0 force
      ; if all this has been done in less than dt (in real time) idle so that the actor moves in real time
      while [timer - t < dt] [ ]  ; wait until dt has passed
      tick              ; update the screen and repeat
    ]]
  calculate-period             ; automatically computes period and frequency
  set DG-data-ready? true
end

to-report force-spring [x v]  ; the force of the spring as a function of its position and velocity
  report 0 - (spring-constant * (x + pivot-displacement - center-position) + friction * v)
end

to-report force-pend [x v]    ; this is the force for a horizontal displacement of x with friction
  report 0 - ((.00981 * mass-in-grams * (x - center-position) / pendulum-length ) + friction * v) 
end

to add-position-point [pos time cnum]
  create-dots 1 [                    ; create a new position dot
    set w who                        ; save the who of this dot
    set x-val time                   ; give it the (internal) problem coordinates (time,pos)
    set y-val pos 
    set dot-color cnum
    set shape "dot" set size dot-size 
    set selected? true set removed? false  setuv st] ; show on screen
  if time > 0 [                         ; except for the first point
    ask turtle w1 [ create-line-with turtle w ]         ; connect the current dot with the old one
    ask line w w1 [ set thickness .5 set color cnum ]]
  set w1 w     ; save the current dat as the old one for next iteration
end
    
to add-force-point [f t] ; places a force point on the graph 
  if not show-force? [stop]      
  create-dots 1 [                 ; create a new force dot
    set w2 who
    set x-val t  ; give it the (internal) problem coordinates f,t
    set y-val f * f-scale 
    set dot-color force-color 
    set shape "dot" set size dot-size 
    set selected? true set removed? false  setuv st] ; show on screen
  if t > 0 [                         ; except for the first point
    ask turtle w3 [ create-line-with turtle w2 ]         ; connect the current dot with the old one
    ask line w2 w3 [ set thickness .5 set color force-color ]]
  set w3 w2     ; save the current force dat as the old one for next iteration
end   


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;; Frequency and period calculations ;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to calculate-period ; reports the period of the selected dots in current graph (assumed to be periodic) 
  ; the rountine looks for x-values where the graph crosses the center-position (a global) and assumes that a pair of these is one period
  ; it looks for multiple pairs.
  let cNum read-from-string graph-color         ; cNum is the color number used in Logo for the graph-color that the user selected  
  let p 0                                       ; p will be the period
  if (count dots with [color = cNum and selected?]) > 3 [     ; at least four points are needed for one period--skip to end if not
                                                ; find each of the zero crossing pairs. 
                                                ; Divide the x-value difference of the first and last crossing by the number of pairs. 
                                                ; this will be the period or, if none found, zero 
                                                ; first, find the first dot
    let first-x 1e6
    ask dots with [color = cNum and selected? ][               ; check all the dots of this color
      if x-val < first-x [ set first-x x-val ]]            
                                                ; at this point first-x is the x-coordinate of the first dot
                                                ; find the first zero crossing
    let temp next-zero first-x                  ; temp contains [found? x-crossing] for the first crossing after first-x
    if first temp [                             ; if there is no crossing, skip the rest and leave the period as zero
      set first-x last temp                     ; set first-x as the x-coordinate of the first crossing
;      ask dots with [color = xNum and x-val = first-x and selected? [
;          set size size + 1]                    ; enlarge this dot to give the user visual feedback 
      let pairs 0                               ; counts the number of pairs of crossings found
      let pair-found? true
      let last-x first-x                        ; last-x will be the last crossing--it starts as the first
      while [pair-found?][                      ; repeat as long as pairs are being found
        set temp next-zero last-x               ; temp contains [found? x-crossing]
        ifelse first temp                       ; if a crossing is found
          [set temp next-zero last temp         ; reuse temp to store [found? x-crossing] for the next crossing
            ifelse first temp                   ; if that second one is found...
              [ set pairs pairs + 1             ; record that a new pair has been found
                set last-x last temp            ; update last-x, the last crossong found
                set p (last-x - first-x ) / pairs ]   ; compute the period based on this latest pair of crossings
              [set pair-found? false ]]         ; if the second is missing, stop the loop
          [set pair-found? false ]]]]             ; if the first is missing, stop the loop
  set period p   tick                          ; if pairs have been found, period will be zero
end                                         ; otherwise, the period will be as accurate as possible

to-report next-zero [x]  ; looks for the next intersection of the data and center-position after x of the selected graph using physical values
  ; reports a list [found? x-crossing] If none is found found? is false
  let found? false
  let x-crossing x 
  let ans list found? x-crossing   ; the default return
  let cNum read-from-string graph-color     ; cNum is the color number used in Logo for the graph-color that the user selected
  if 2 > count dots with [cNum = color and selected?] [report ans ]  ; this terminates the procedure of there are 0 or 1 dots of this color
  ; find the first dot to the right of x
  let nearest 1e6 
  set w 0
  ask dots with [cNum = color and selected? ] [      ; ask all the dots in the selected graph...
    if x-val > x [                    ; if the dot is to the right of x
      if nearest > (x-val - x) [      ; and if this dot is nearer to x than any found so far
        set w who                     ; record the who of this dot
        set nearest (x-val - x) ]]]   ; save the x-distance 
  ; at this point w contains the who of the first dot after x
  if w = 0 [report ans]  ; if there are no dots to the right return not found? 
  let start-x-val [x-val] of dot w      ; save the x,y coordinates of this dot
  let start-y-val [y-val] of dot w 
  
  ; now find the first dot for which y-val is on the opposite side of center-position as the y-val of dot w
  set nearest 1e6 
  let x2 0 let y2 0
  ask dots with [cNum = color and selected? ] [      ; again, ask all the dots in the selected graph...
    if x-val > start-x-val [          ; if this dot is to the right of the first one after x
      if (start-y-val - center-position) * (y-val - center-position) < 0 [      ; and they have oppositie signs
        if (x-val - start-x-val) < nearest [  ; and this one is nearer than any found so far
          set x2 x-val set y2 y-val   ; save the coordinates of this dot
          set found? true
          set w who
          set nearest x-val - start-x-val]]]]        
  if not found? [report ans ]  ; if none found, return a list with found? false
  ; at this point, x2 and y2 contain the coordinates of the nearest dot with a different sign
  ask dot w [set size size + 1]      ; enlarge this dot to provide user feedback
  
  ; now find x1, y1, the coordinates of dot before the one just found, which must be on the opposite side of center-position
  set nearest 1e6
  let x1 0 let y1 0
  ask dots with [cNum = color and selected? ] [      ; once again, ask all the dots in the selected graph...
    if x-val < x2 [                   ; if this dot is before x2
      if x2 - x-val < nearest [       ; and it is the closest one found so far
        set x1 x-val set y1 y-val     ; record the xy coordinates of this point
        set nearest x2 - x1           ; record the distance between x1 and x2  
        set w who ]]]
  ask dot w [set size size + 1]       ; enlarge this dot to provide user feedback  
  ; at this point we have x1,y1 the nearest dot before the first crossing and x2,y2 the first dot after the first crossing.
  
  ; finally draw a straight line between these points and solve for x(y = center-position) 
  let m (y2 - y1) / (x2 - x1)         ; the slope of the straight line
  let b y1 - (m * x1)                 ; b, as in y = mx + b
  set x-crossing (center-position - b ) / m            ; if y = cp then x = (cp - b)/m
  report list true x-crossing
end


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;; Supporting actors  ;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;to place-actors ; sets actor at the beginning of the stage. 
;  if stage? [
;    let xmin first item 1 walk-params
;    ask actors with [number = 2] [set color read-from-string graph-color]
;    draw-actor-on-stage 2 xMin 0  ; place the second actor at the end of the walking scale
;    let temp last convert-to-screen 0 0 xMin  ; get xMin in screen coordinates
;    show-spring 2 7 stage-center pivot-center-v temp        ;n cnum u-center v-top v-bottom
;  ]
;end

to draw-actor-on-stage [num y pivot-y force]  ; places actor num at y on the stage
  ; if vertical, the actor is at y attached to a pivot at stage-center (in screen coordinates) and pivot-y in problem coordinates
  ; draws the spring between them
  ; shows the force, if show-force? is true
  ; actors can be distinguished using their varialbe 'number', which is 1 for the first, 2 for the second
  ; only number 2 is used to represent the mass in this model
  ; this routine works for both the vertical and horizontal scales
  
;  let s-bounds first walk-params             ; extract the stage boundaries
;  let umin first s-bounds
;  let umax item 1 s-bounds
;  let vmin item 2 s-bounds
;  let vmax item 3 s-bounds
;  let trans item 3 walk-params               ; extract the transformation coeficients 
;  let m first trans
;  let c item 1 trans
  let u 0 let v 0                            ; initialize u v
  
  if stage = "Vertical" [
    set u stage-center                   ; place in center of stage
    set v last convert-to-screen 0 0 y         ; convert the vertical position of the actor in screen coordinates
    let pivot-v last convert-to-screen 0 0 pivot-y  ; convert the vertical position of the pivot
    let out-of-view? false 
    ifelse in-view? u v 
      [ask actors [st setxy u v set color read-from-string graph-color]]
      [ask actors [ht] set out-of-view? true]
    ifelse in-view? u pivot-v 
      [ask pivots [st setxy u pivot-v set color read-from-string graph-color]]
      [ask pivots [ht] set out-of-view? true]
    if not out-of-view? [
      show-spring num 7 u pivot-v v]]     ; connect actor and pivot with spring. Variables: num, color, center, top, bottom
  
  if stage = "Horizontal" [ 
    set u last convert-to-screen 0 0 y      ; place at location x converted to screen coordinates
    set v stage-center             ; set the mass vertically in the stage
    ask actors [ 
      ifelse in-stage? u v                   ; if u, v is in the stage.....
        [  setxy u v st                           ;    move the actor there and show it
          set color read-from-string graph-color]
        [ht]]]
                
   if show-force? [
     let angle 0 if stage = "Horizontal" [set angle 90]
     let temp last convert-to-screen 0 0 f-scale
     draw-vector num temp force angle u v force-color  ; Draw-vector requires screen units
     if force = 0 [hide-vector num]] ;    otherwise hide it.                     
end


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;; making and displaying graphs ;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to sketch-graph
  let colorNumber read-from-string graph-color        ; read the graph-color selector and convert to a color number
  ask dots with [dot-color = colorNumber ] [die]      ; get rid of the dots of the currently selected graph-color 
  let s-bounds first grid-params                      ; the usual retrieval of variables needed here
  let uMin first s-bounds
  let uMax item 1 s-bounds

  let trans item 3 grid-params
  let xm first trans
  let xc item 1 trans
  let ym item 2 trans
  let yc item 3 trans
  
  let du (uMax - uMin) / (N-points - 1)               ; divide the grid into N-points vertical lines in screen coordinates
  let u uMin let v 0
  create-dots N-points [ht                            ; create N-points colored dots, give them u-values but hide them           
     set dot-color colorNumber 
     set color dot-color 
     set size dot-size set shape "dot" 
     set selected? true set removed? false
     setxy u v                                        ; assign each dot to one of the vertical positions
     set u u + du ]
  while [not  mouse-inside? ] [ ]                      ; do nothing until the user enters the view after pressing the sketch button
  while [mouse-inside? ][                              ; do  the following until the the mouse leaves the view
    if (mouse-down? and mouse-in-grid?) [              ; collect data while the mouse is down in the view
      set u mouse-xcor
      set v mouse-ycor
      ask dots with [dot-color = colorNumber and 
         abs( u - xcor ) < du / 2]  [                 ; find a dot with u-value nearest the cursor 
            setxy xcor v                                 ; move the selected dot to the cursor position and show it
            st ]]]                                    ; loop back to "while" until the OK button is clicked

  ; convert the u, v locations of the N-points of dots to problem coordinates and kill off unused ones
  ask dots with [color = colorNumber ] [
    ifelse hidden? [ die ] [                          ; it a dot is hidden, it was missed during the sketch
      set x-val ( xcor - xc ) / xm                    ; tell each visible dot its problem coordinates
      set y-val ( ycor - yc ) / ym ]]
end

to auto-scale                                         ; looks through all the data and picks p-scales to show all selected data
  hide-vector 1 hide-vector 2
  ask dots [set selected? true]                       ; de-select all the dots--undo the selection
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

to  draw-box  [u v u1 v1 ]                              ; draws  a box defined by u, v, u1, v1 using links
   ask box-dots [st]
   ask dot0 [setxy u v]
   ask dot1 [setxy u v1]
   ask dot2 [setxy u1 v1]
   ask dot3 [setxy u1 v]
end


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; interacting with data ;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to select-and-zoom  ; a simplified selector that simply shows a region and zooms to it. 
  let trans item 3 grid-params                      ; dig out the transformation coefs
  let xm first trans
  let xc item 1 trans
  let ym item 2 trans
  let yc item 3 trans

  while [not (mouse-down? and mouse-inside?) ] [ ]  ; wait for mouse-down on view
  ask box-dots [st]
  let u-initial mouse-xcor                          ; save initial mouse position
  let v-initial mouse-ycor
                                                   ; the rest of the code supports dots b/c tag? is false here
  let u-current u-initial
  let v-current v-initial
  while [mouse-down?] [                         ; while mouse-down, draw a box between initial and current position
    set u-current mouse-xcor
    set v-current mouse-ycor
    draw-box u-initial v-initial u-current v-current
    tick]      
  ; At this point, we have the boundaries selected. now zoom into them. 
  let xmin (u-initial - xc) / xm 
  let xmax (u-current - xc) / xm
  if xmin > xmax [
    let t xmin set xmin xmax set xmax t]
  let ymin (v-initial - yc) / ym 
  let ymax (v-current - yc) / ym
  if ymin > ymax [
    let t ymin set ymin ymax set ymax t]
  
  ask dots [set selected? (x-val >= xmin and x-val <= xmax)]   ; Select all dots between xmin and xmax

  ; Simply stuff the correct values into the parameter lists and draw the graph
  let p-bounds (list xmin xmax ymin ymax)                      ; put new range and domain into p-bounds of grid-params
  set grid-params replace-item 1 grid-params p-bounds
  let pw-bounds (list ymin ymax)                          ; put new range into p-bounds of walk-params
  if stage? [set walk-params replace-item 1 walk-params pw-bounds]     ; @@@@@@
  draw-view
  ask box-dots [ht setxy 0 0]                       ; the easy way to hide the lines is to put all the turtles on top of one another
  calculate-period
  set DG-data-ready? true
  tick
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

to-report in-stage? [u v]
  let s-bounds first walk-params             ; extract the stage boundaries
  let umin first s-bounds - 1
  let umax item 1 s-bounds + 1
  let vmin (item 2 s-bounds - 2)             ; the 2 gives the user a bit more room for straying from the center line.  
  let vmax (item 3 s-bounds + 2)
  ifelse (u < uMin or u > uMax or v < vMin or v > vMax) 
    [report false ][report true]
end

to-report in-view? [u v]
  report u < max-pxcor and u > min-pxcor and
    v < max-pycor and v > min-pycor 
end

to setuv  ; in dot context, draws the current dot representing x-val, y-val in the graph defined by grid-params
   ; controls the color, shape, and turns the dot on
   ; It makes little arrowheads pointing in the right direction if (x-val, y-val) is outside the graphing area. 
   ; points are grey if not selected and tiny if removed  
   ; first, unpack the parts of graph-params that are needed
   let sb first grid-params   ; the screen bounds
   let umin first sb
   let umax item 1 sb
   let vmin item 2 sb
   let vmax last sb
   let trans item 3 grid-params
   let mx first trans 
   let cx item 1 trans
   let my item 2 trans
   let cy item 3 trans
   
   let u mx * x-val + cx                        ; the horz screen coordinate of the x-value
   let v my * y-val + cy                        ; the vertical screen coordinate of the y-value
   let done? false                              ; u and v might be off-grid, in which case the dot shows up as an
                                                ;   arrowhead on the edge or corner pointing toward its location
   set shape "dot"                                             
   if u < umin  [                               ; check on the left
      set shape "default"                       ; out of bounds on the left
      set u umin  
      set heading 270
      if v < vmin [set heading 225 set v vmin]  ; off scale on left and bottom
      if v > vmax [set heading 315 set v vmax]  ; off scale on left and top
      set done? true]
   if u > umax [                                ; check on the right
      set shape "default"                       ; out of bounds on the right      
      set u umax  
      set heading 90
      if v < vmin [set heading 135 set v vmin]  ; off scale on right and bottom
      if v > vmax [set heading 45 set v vmax]   ; off scale on right and top
      set done? true]
   if v > vmax and not done? [                  ; off scale on bottom but not left or right (those have been 'done')
      set shape "default"
      set heading 0
      set v vmax
      set done? true]
   if v < vmin and not done? [                  ; off scale on top but not left or right
      set shape "default"
      set heading 180
      set v  vmin]
   setxy u v                                    ; move the turtle to the point u,v
   ifelse selected?                             ; make de-selected dots more grey
     [set color dot-color]
     [set color dot-color - 2 ]
   ifelse removed?                              ; make removed dots tiny
     [set size .5 * dot-size ] [set size dot-size]
   st
end

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;; scale and grid-drawing routines ;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to scale-Grid   ; Completes the grid-params by supplying the transform coeficients
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
  let ticLength 4     ; the length of the tic marks below the grid
  ; unpack the parameters needed from grid-params
  ; xLow xHi yLow yHi xntics yntics xm xc vmax vmin xlabel

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
  repeat xNtics [
    create-verticals 1 [                               ; create the vertical lines  by drawing down from the top
      set label precision x 3
      set heading 180                                  ; aim down
        ifelse x = xLow or x = xHi 
          [set color white set pen-size 2 ]            ; for the edges!
          [set color gray set pen-size 1 ]             ; for the inside lines
        setxy (xm * x + xc) vmax 
        ]
     set x x + dxx ]                                     ; at this point turtles are poised to descend from the top of the graph
  ask verticals [ pd fd vmax + ticLength - vmin ]        ; draws all the verticals at once 
  ask labels [die]
  create-labels 1 [
    set label first ll
    setxy .5 * (uMin + uMax) vMin - 8
    set color black ]

  let dyy (yHi - yLow)/(yNtics - 1)                     ;  the distance between y-tics in problem coordinates
  let y yLow
  repeat yNtics [
    create-horizontals 1 [                               ; create the vertical lines  by drawing left from the right
      set label precision y 3
      set heading 270                                  ; aim left
        ifelse y = yLow or y = yHi 
          [set color white set pen-size 2 ]            ; for the edges!
          [set color gray set pen-size 1 ]             ; for the inside lines
        setxy umax (ym * y + yc) 
        ]
     set y y + dyy ]                                     ; at this point turtles are poised to descend from the top of the graph
  ask horizontals [ pd fd umax + ticLength - umin ]        ; draws all the verticals at once 
  create-labels 1 [
    set label last ll
    setxy uMin + 11 vMax + 5
    set color black ]
  
  ask cursors [die]         ; create cursor and hide it. First kill off any existing cursors 
  create-cursors 1 [         ; create the lower end of the cursor
    set w who 
    setxy umin vmin ht]
  create-cursors 1 [         ; create the upper end of the cursor 
    setxy umin vmax 
    create-cursor-line-with turtle w
    ht]
  ask cursor-lines [      ; connect the lower and upper ends with a white line
    set color white set thickness .4 set hidden? true]   ; hide the line
end

to set-scale  ; reads the user-supplied ranges, labels, and units and sets the graph scales accordingly
  hide-vector 1 hide-vector 2
  set max-x run-duration-in-sec
  let pb (list min-x max-x min-y max-y)
  set grid-params replace-item 1 grid-params pb
  set grid-params replace-item 2 grid-params list x-label y-label ; read the user labels and put them in the right place.
  if stage? [                                          ; if there is a stage                  
    set walk-params replace-item 2 walk-params y-label
    set walk-params replace-item 1 walk-params list min-y max-y]
            ; update the w-bounds in grid-params with the new range 
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
  let vert ( 2 * vMin + vMax) / 3                          ; put the scale below the center of the stage

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
  
  let ticLength 3                                      ; the length of the tic marks below the grid
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
   create-labels 1 [ ht setxy (umax + umin) / 2 vert - 7 set label tag-line st ]]
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

to draw-vector [n force-convert force direction origin-u origin-v cnum]  ; draws vector n starting at (origin-u, origin-v) of color cnum
  ; force-convert is a factor that coverts the actual force into a vector length = force * force-convert
  ask arrowtails with [number = n][          ; arrowtails and arrowheads of the same number are already connected
    ifelse in-stage? origin-u origin-v        ; if inside stage, set origin
      [setxy origin-u origin-v]
      [hide-vector n]]
  ask arrowheads with [number = n][
    let magnitude force * force-convert
    let u origin-u + magnitude * sin direction
    let v origin-v  + magnitude * cos direction
    ifelse in-stage? u v 
      [setxy u v
        ifelse magnitude > 0 
          [set heading direction]
          [set heading direction + 180 ]
        set color cnum
        set label word precision force 1 " N"
        st ]
      [hide-vector n]]
end

to hide-vector [n]
  ask arrowtails with [number = n][
    ht setxy 0 0 ]
  ask arrowheads with [number = n][
    ht setxy 0 0 ]
end

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;; Spring routines ;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

to create-spring [n L]  ; creates an ur-spring n that contains L links
  ; A spring is made from linked invisible turtles called spring-ends, each with a number n
  ; Spring-ends are connected with links called spring-parts. 
  ; The spring-ends have u,v coordinates that fit between 0 and 1 along the axis (u values) of the spring
  ;    and -1 to 1 transversely (the v values)
  ; When it it time to show a spring, the turtle u,v coordinates are transformed as needed to screen coordinates
  ;    and the spring-parts are made visible
  ; The first step is to create 'ghost' spring coordinates with the right width but with L kinks. 
  ; After creating it, its v coordinates will scaled to [0,1]
  ; A separate routine will place the spring between two points
  let u [0]   ;u and v will be the coordinates for the ghost spring, these are the second pair of coordinates
  let v [1.5]  ; the first is (0,0) and is treated separately since it is not linked to a previous one...
  let k 0   ; k will be the index to the current kink, consisting of two points         
  let vert 2
  while [k < L] [  ; repeat for L kinks
    set u lput 1 u  
    set v lput vert v
    set u lput -1 u
    set vert vert + 1
    set v lput vert v
    set vert vert + 1
    set k k + 1 ]
  set u lput 0 u set v lput (vert - .5) v ; 
  set vert vert + 2
  set u lput 0 u set v lput vert v
  set w 0 set w1 0
  create-spring-ends 1 [ ht ; create the first spring end
    set w who set number n
    set u-fraction 0 set v-fraction 0]
  let i 1
  while [i < vert ][           ; create the remaining spring ends and connect them
    create-spring-ends 1 [ ht
      set w1 who set number n
      set u-fraction first u 
      set v-fraction first v / vert
      create-spring-part-with spring-end w] ; connect to the previous spring end 
    set u bf u set v bf v
    ask spring-part w w1 [ 
      set thickness .5
      set spring-number n]
    set w w1
    set i i + 1 ]
  ask spring-ends [st set color 7]
end

to show-spring [n cnum u-center v-top v-bottom]  
  ; shows a vertical spring n, colored cnum, centered around u-center, connecting v-top to v-bottom
  if (in-view? u-center v-top and in-view? u-center v-bottom) [
    let l v-top - v-bottom
    let width 1.5
    ask spring-ends with [number = n][  ; pick out the spring ends for spring n
      setxy (u-center + width * u-fraction) (v-bottom + l * v-fraction )
      ask spring-parts with [spring-number = n] [set color cnum]]]
end

to hide-springs
  ask spring-ends [
    setxy 0 0 ht] 
end

to show-cursor  ; creates a vertical cursor and labels all of its intersections with graphs
  ; first figure out what colors are represented in the graph
  let graph-colors [ ]
  let vmin item 2 first grid-params
  let trans item 3 grid-params
  let xm first trans
  let xc item 1 trans
  let ym item 2 trans   ; vertical transformation coeficients
  let yc item 3 trans   ; y=(v-yc)/ym 
  ask dots [        ; check every dot
    if not member? dot-color graph-colors [     ; if its color is not in the graph-colors list
      set graph-colors fput dot-color graph-colors ]]  ; put its color into the list
      ; graph-colors is a list of all the different colors present in the current graph
  while [not mouse-inside? ][wait .03]
  while [mouse-inside?] [
    if mouse-in-grid? [       ; show vertical cursor
     carefully [ 
      ask messengers [die]
      ask cursor-lines [set hidden? false]   ; show the cursor
      ask cursors [
        set xcor mouse-xcor ] ; move the cursor to the mouse
        create-messengers 1 [     ; draw an x-axis label 
          set color white set size .5 set shape "circle"
          setxy mouse-xcor vmin + 1
          let x (mouse-xcor - xc) / xm 
          set label word precision x 3 " s  " ]
        ; At this point there is a cursor. Next, figure out the intersection of all graphs with it
        let n-colors length graph-colors 
        let i 0
      while [i < n-colors][   ; process each color present
        let cnum item i graph-colors ;   pick the first color remaining in the graph-colors list
        ; now work on the graph of colored cnum. First find the nearest points in screen coordinates to the right and left. 
        let left-u min-pxcor let left-who 0
        let right-u max-pxcor let right-who 0
        let left-v 0 let right-v 0 
        ask dots with [color = cnum][           ; check all the dots of this color
          if xcor < mouse-xcor [                ; if this point is to the left of the mouse...
            if xcor > left-u [                  ;      and is larger than the previous nearest pont to the left
              set left-u xcor                   ; save the u coordinate of this point as the nearest to the left
              set left-v ycor
              set left-who who]]                ; save the who of this point
          if xcor > mouse-xcor [                ; if this point is to the right of the mouse...
            if xcor < right-u  [                ;      and is smaller than the previous nearest point to the right
              set right-u xcor                  ; save the u coordinate of this point
              set right-v ycor
              set right-who who ]]]             ; save the who of this point
                                                ; We now have the nearest points of this color to the cursor: left-who and right-who
        if not ((left-who = 0 ) or (right-who = 0 )) [    ; procede with this color only if points to the left and right have been found
          if in-grid? left-u left-v and in-grid? right-u right-v [  ; only if the two points are showing in the grid
            ; compute the intersection of the line between the two points and the cursor
            if not (right-u = left-u )[
              let vc left-v + (right-v - left-v) * (mouse-xcor - left-u) / (right-u - left-u)  ; the vertical screen coordinate of the intersection
              let y (vc - yc) / ym ; the physical value at that point
          
              create-messengers 1 [                           ; create a label that will show the values. 
                set color cnum set size .5 set shape "circle"
                ifelse cnum = force-color 
                  [ set label word precision (y / f-scale)  2 " N  "]  ; the force is scaled differently
                  [set label word precision y 2 " m  "]
                setxy mouse-xcor vc ]]]]
        set i i + 1]
      tick][ ]]      ; all colors have been processed and cursor intersections computed. Do nothing if there is an error
  ] ; at this point, the mouse has left the display area
  ask cursor-lines [set hidden? true]       ; on exit, hide the cursor  
  ask messengers [die]
end 
    
to add-points [x y color-of-x f]   ; add a point to the graph at x,y. and connect it to point w if w>0
                           ; the dot and line have color color-of-x
                           ; if show-force? also add a point at x (force * f-scale) and connect it to point w2 if w2>0
                           ; the force point and line have color force-color, a global
                           ; w w2 and f-scale are globals that must be set correctly, w and w2 are updated
  set w add-one-point x y color-of-x w
  if show-force? [set w2 add-one-point x f force-color w2]
end
  
to-report add-one-point [x y cnum previous-who]  ; graphs a point at x,y in problem space and connects it to previous-who
  ; the dot and line have color cnum. Returns the who of the new point
  let my-who 0
  create-dots 1 [                                 ; create a new x,y point       
    set my-who who set dot-color cnum set color cnum 
    set size dot-size set shape "dot" set selected? true set removed? false
    set x-val x  set y-val y setuv   ]  ; draws the dot   
  if previous-who > 0 [ 
    ask turtle my-who [ create-line-with turtle previous-who ]          ; connect the dots
    ask line my-who previous-who [set color cnum ]]
   report my-who
end

to place-pivot [y]  ; place pivot at y (in problem coordinates) if on-screen
  let cnum read-from-string graph-color           ; read the color to be used for this run  
  let pos last convert-to-screen 0 0 y
  ask pivots [
    ifelse in-view? stage-center pos 
      [st setxy stage-center pos ]
      [ht]]
end

to-report convert-to-screen [x y z] ; converts from problem coordinates to screen coordinates.
  ; returns a list consisting of u, v, and w, the screen x,y coordinaes and the distance along the stage
  ; this is the inverse of convert-to-problem

  let trans item 3 grid-params     ; get the transforms for the grid
  let xm first trans               ; u = xm * x + xc
  let xc item 1 trans
  let ym item 2 trans              ; v = ym * y + yc
  let yc item 3 trans
  set trans item 3 walk-params     ; get the minimum and max of the vertical scale
  let m first trans                ; get the y-to-pos transformation coefs for the walk ( pos = m*y + c)
  let c item 1 trans               ; conversely y = (v - yc)/ym
  let u xm * x + xc
  let v ym * y + yc
  let pos m * z + c
  report (list u v pos)
end

to-report convert-to-problem [u v pos] ; converts from screen coordinates to problem coordinates. 
  ; returns a list consisting of the x,y screen coordinates and pos, the distance along the stage in problem coordinates. 
  ; this is the inverse of convert-to-screen. 

  let trans item 3 grid-params     ; get the transforms for the grid
  let xm first trans               ; u = xm * x + xc
  let xc item 1 trans
  let ym item 2 trans              ; v = ym * y + yc
  let yc item 3 trans
  set trans item 3 walk-params     ; get the minimum and max of the vertical scale
  let m first trans                ; get the y-to-pos transformation coefs for the walk ( pos = m*y + c)
  let c item 1 trans               ; conversely y = (pos - c)/m)
  let x (u - xc) / xm
  let y (v - yc) / ym
  let z (pos - c) / m
  report (list x y z)
end
    


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;  Data export  ;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;


to export-data  ; puts data into Jason data format and tells DG that it is available
  if not DG-data-ready? [stop]
  set DG-exported? false
  
  let x-name "time (sec)" let y-name "position (m)"
  let preamble preamble-maker   ; first make a preamble that is a list of lists of name, value pairs
  let output "{\n" ; the first lines of Jason data are an open curley bracket, cr and quote
  let temp [ ]             ; initialize the temporary variable as a list
  if length preamble > 0 [    ; attach the special first pair
    set temp first preamble
    set output (word output " \"" first temp "\": \"" last temp "\",\n")
;    set output word output "  {\n"
    set preamble butfirst preamble ]
  set output word output "  \"cases\" : [\n     {\n"
  while [length preamble > 0] [     ; attach all the remaining key-value pairs in the preamble
    set temp first preamble 
    set output (word output "      \"" first temp "\": " last temp ",\n")
    set preamble butfirst preamble ]
  set output word output "      \"contents\": {\n        \"collection_name\": \"Position\",\n        \"cases\": [\n" 
  
  let data-pairs data-pair-maker    ; then make a data list consisting of lists of time, value pairs  
  while [length data-pairs > 0 ][
    set temp first data-pairs
    set output (word output "          { \"" x-name "\": " (first temp) ", \"" y-name "\": " (last temp) " }")
    ifelse (length data-pairs != 1 )                 ; do not put a comma at the end of the last pair
      [set output word output ",\n"]
      [set output word output "\n"]
    set data-pairs butfirst data-pairs ]
  set output word output "        ]\n      }\n    }\n  ]\n}"
  set DG-output output
  set DG-data-ready? false
  set DG-exported? true
end

to-report preamble-maker; generates a list of lists of name, value pairs. 
  ; The first pair must be ["collection_name" filename ] for example ["collection_name" "spring-and-mass.nlogo"]
  let output [ ]
  let f 0 if period != 0 [set f precision (60 / period) 3]
  let p precision period 3
  if stage = "Horizontal" [
    set output (list list "collection_name" "IS Pendulum Model")
    set output lput list "Period (sec)" p output
    set output lput list "Frequency (cpm)" f output 
    set output lput list "Mass in grams" mass-in-grams output
    set output lput list "Friction" friction   output
    set output lput list "Pendulum length (m)" pendulum-length output]
  if stage = "Vertical" [
    set output (list list "collection_name" "IS Mass-spring Model")
    set output lput list "Period (sec)" p output
    set output lput list "Frequency (cpm)" f output 
    set output lput list "Mass in grams" mass-in-grams output
    set output lput list "Friction" friction   output 
    set output lput list "Spring constant (N/m)" spring-constant output 
    set output lput list "Force frequency (cpm)" force-frequency output 
    set output lput list "Force amplitude (m)" force-amplitude output 
        ]
  set output lput list "Starting position (m)" (precision starting-position 3)  output
  set output lput list "Max amplitude (m)" (precision (.5 * (max-of-run - min-of-run)) 2 )  output
  report output
end

to-report data-pair-maker; generates a list of [time value] pairs. 
  let data-pairs [ ]  ; 
  let c read-from-string graph-color 
  foreach sort-on [xcor] dots with [color = c and selected? ][
    ask ? [ set data-pairs lput list (precision x-val 3) (precision y-val 3)   data-pairs ]]
  report data-pairs
end

to reset
  ifelse DG-data-ready?     ; check whether the user wants to lose the current data. 
    [if user-yes-or-no? "Erase your data without exporting?" 
      [ask dots [die] set DG-data-ready? false ]]
    [ask dots [die]]
end
   
    
    
    
    
    
    
@#$#@#$#@
GRAPHICS-WINDOW
10
77
409
387
70
50
2.7624
1
10
1
1
1
0
0
0
1
-70
70
-50
50
1
1
0
ticks
30.0

BUTTON
150
68
280
102
Auto-scale
auto-scale
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
606
32
731
77
Graph-color
Graph-color
"Red" "Green" "Yellow" "Blue" "Orange" "Magenta" "White"
2

BUTTON
420
32
486
77
Setup
setup
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

INPUTBOX
606
78
732
138
Run-duration-in-sec
10
1
0
Number

BUTTON
10
68
151
102
Select and Zoom
select-and-zoom
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
132
424
247
458
Start
Run-model
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
445
175
703
208
Mass-in-grams
Mass-in-grams
1
500
161
1
1
g
HORIZONTAL

SLIDER
445
238
703
271
Spring-constant
Spring-constant
.05
10
4.76
.01
1
N/m
HORIZONTAL

SLIDER
445
205
703
238
Friction
Friction
0
.2
0
.001
1
NIL
HORIZONTAL

MONITOR
532
412
618
457
Period
word (precision period 3) \" sec\"
3
1
11

CHOOSER
485
32
607
77
Model-type
Model-type
"Pendulum" "Spring and mass" "None"
1

SLIDER
445
271
703
304
Pendulum-length
Pendulum-length
0.01
3
1.51
.01
1
m
HORIZONTAL

TEXTBOX
537
155
611
173
Variables
14
0.0
1

BUTTON
336
424
410
457
Reset
reset
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
279
68
409
102
Show Cursor
Show-cursor
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

TEXTBOX
100
14
408
40
InquirySpace Motion Model
18
105.0
1

MONITOR
445
412
532
457
Frequency
word (precision (60 / period) 1) \" per min\"
17
1
11

INPUTBOX
420
77
514
137
Center-position
1
1
0
Number

INPUTBOX
512
77
605
137
Amplitude
0.5
1
0
Number

SWITCH
247
424
337
457
Stop?
Stop?
1
1
-1000

TEXTBOX
551
10
600
28
Setup
14
0.0
1

TEXTBOX
549
390
605
408
Results
14
0.0
1

BUTTON
10
390
222
424
Move to any starting position
Set-starting-position
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

TEXTBOX
231
402
357
422
Model Controls\n
14
0.0
1

BUTTON
10
424
134
458
Move to center
start-at-center
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

TEXTBOX
168
49
261
68
Graph Tools
14
0.0
1

MONITOR
617
412
705
457
Max amplitide
word (.5 * (precision (max-of-run - min-of-run) 2 )) \" m\"
1
1
11

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

cylinder
false
0
Circle -7500403 true true 0 0 300

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
Polygon -7500403 true true 270 75 225 30 30 225 75 270
Polygon -7500403 true true 30 75 75 30 270 225 225 270

@#$#@#$#@
NetLogo 5.0.2
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
