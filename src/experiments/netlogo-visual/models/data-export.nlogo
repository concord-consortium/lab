;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;; Data export functions ;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;;; put in globals

  ModelData
  ModelDescription
  RunSeries
  DataSeries
  data-ready?

;;

;;;
;;; put at end
;;;

to init-RunSeries
  set RunSeries "[\n  ]"        ; 
end

to init-DataSeries
  set DataSeries "[ ]"        ; this will contain triplet dummy values in json format
end

to update-RunSeries [ a-max ]
  let postamble "\n  ]"
  let temp "\n"
  if run-number > 1 [set temp ",\n"]  ; subsequent runs need to be delimited with a comma.

  set temp (word temp "    {\n")
  set temp (word temp "      \"TimeSeriesData\": " DataSeries ",\n")
  set temp (word temp "      \"computationalInputs\": [" Distance-to-steering-wheel ", " car-speed ", " airbag-size ",\n")
  set temp (word temp "        " time-to-fill-bag ", " const ", " max-time-to-stop ", " deflate-time " ],\n")
  set temp (word temp "      \"computationalOutputs\": [ " a-max ", \"" dummy-status "\" ],\n")
  set temp (word temp "      \"studentInputs\": [ \"" the-question "\" ]\n")
  set temp (word temp "    }")

  let len-rs length RunSeries
  let len-pa length postamble
  set RunSeries substring RunSeries 0 (len-rs - len-pa)
  ; set RunSeries bl RunSeries    ; strip off the final square bracket
  set RunSeries (word RunSeries temp "\n  ]")  ; add in the new DataSeries and append a final sqare bracket

end

to update-DataSeries [ t x-dum v-dum ]
  ; now updata DataSeries
  let trip ""  if t != 0 [set trip ","] ; the first triplet doesn't have a preceding comma.
  set trip (word trip "[" t ", " x-dum ", " v-dum "]")
  set DataSeries bl DataSeries    ; strip off the final square bracket
  set DataSeries (word DataSeries trip "]")  ; add in the new triplet and append a final sqare bracket
end

to make-ModelDescription
  set data-ready? false
  let temp ""

  set temp (word temp "{\n")
  set temp (word temp "    \"timeSeriesData\": [\n")
  set temp (word temp "      { \"label\": \"Time\", \"units\": \"s\", \"min\": 0, \"max\": " max-x " },\n")
  set temp (word temp "      { \"label\": \"Position\", \"units\": \"m\", \"min\": 0, \"max\": " max-y " },\n")
  set temp (word temp "      { \"label\": \"Velocity\", \"units\": \"m/s\", \"min\": -10, \"max\": " 10 " }\n")
  set temp (word temp "    ],\n")
  set temp (word temp "    \"computationalInputs\": [\n")
  set temp (word temp "      { \"label\": \"Distance to steering wheel\",\"units\": \"m\", \"min\": 0.1, \"max\":0.5 },\n")
  set temp (word temp "      { \"label\": \"Car speed\",\"units\": \"m/s\", \"min\": 0, \"max\":40 },\n")
  set temp (word temp "      { \"label\": \"Airbag size\",\"units\": \"m\", \"min\": 0, \"max\":0.5 },\n")
  set temp (word temp "      { \"label\": \"Time to fill bag\",\"units\": \"s\", \"min\": 0.01, \"max\":0.05 },\n")
  set temp (word temp "      { \"label\": \"const (airbag-stiffness)\", \"hidden\": true, \"units\": \"m/s^2\", \"min\": 0, \"max\":6000 },\n")
  set temp (word temp "      { \"label\": \"Maximum time to stop\", \"hidden\": true, \"units\": \"s\", \"min\": 0.02, \"max\": 0.1 },\n")
  set temp (word temp "      { \"label\": \"Deflate time\", \"hidden\": true, \"units\": \"s\", \"min\": 0, \"max\":10 }\n")
  set temp (word temp "    ],\n")
  set temp (word temp "    \"computationalOutputs\": [\n")
  set temp (word temp "      { \"label\": \"Maximum acceleration\", \"units\": \"g\", \"min\": 0, \"max\": 200 },\n")
  set temp (word temp "      { \"label\": \"Dummy Survival\", \"units\": \"categorical\", \"values\": [\"Yes\",\"No\",\"Maybe\"]  }\n")
  set temp (word temp "    ],\n")
  set temp (word temp "    \"studentInputs\": [\n")
  set temp (word temp "      { \"label\": \"Goal\", \"units\": \"categorical\" }\n")
  set temp (word temp "    ]\n")
  set temp (word temp "  }")

  set ModelDescription temp
  set data-ready? true
end

to make-ModelData
  make-ModelDescription
  set data-ready? false
  let temp ""

  set temp (word temp "{\n")
  set temp (word temp "  \"description\": " ModelDescription ",\n")
  set temp (word temp "  \"runs\": " RunSeries "\n")
  set temp (word temp "}\n")

  set ModelData temp
  set data-ready? true
end