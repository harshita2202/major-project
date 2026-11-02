# Generates SYNTHETIC demo data with the built-in Windows voices (Zira = "test taker",
# David = "second person") so the pipeline can be exercised end-to-end without recordings.
# TTS voices are far more consistent than humans: use REAL recordings to tune thresholds.
#
#   powershell -ExecutionPolicy Bypass -File tests\make_demo_tts.ps1
#   python -m tests.run_scenarios --data-dir data\demo --build --user-test data\demo\raw\user_test.wav --other data\demo\raw\other.wav
param([string]$Out = "data\demo")

Add-Type -AssemblyName System.Speech
$raw = Join-Path $Out "raw"
New-Item -ItemType Directory -Force -Path $raw | Out-Null
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)

function Say([string]$voice, [string]$text, [string]$path, [int]$rate = 0) {
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SelectVoice($voice); $s.Rate = $rate
  $s.SetOutputToWaveFile((Resolve-Path -LiteralPath (Split-Path $path)).Path + "\" + (Split-Path $path -Leaf), $fmt)
  $s.Speak($text); $s.Dispose()
}

$rainbow = "When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow. The rainbow is a division of white light into many beautiful colours. These take the shape of a long round arch, with its path high above, and its two ends apparently beyond the horizon. There is, according to legend, a boiling pot of gold at one end. People look, but no one ever finds it. When a man looks for something beyond his reach, his friends say he is looking for the pot of gold at the end of the rainbow."
$userText = "The sky appears blue because molecules in the air scatter short blue wavelengths of sunlight more strongly than long red wavelengths. At sunset, light travels through much more atmosphere, so most of the blue is scattered away and the remaining light looks orange and red. I think the same effect explains why distant mountains look slightly blue. Let me also explain the second question about photosynthesis. Plants capture light energy using chlorophyll and convert carbon dioxide and water into glucose and oxygen."
$otherText = "Hey, what did you put for question three? I think the answer is the mitochondria, but I am not completely sure. Can you read me the next question? Just tell me quickly, nobody is watching. The teacher said the final section is worth thirty points, so we should split it up. You do the essay and I will do the multiple choice part, okay?"

Say "Microsoft Zira Desktop"  $rainbow   (Join-Path $Out "enroll.wav")
Say "Microsoft Zira Desktop"  $userText  (Join-Path $raw "user_test.wav") 1
Say "Microsoft David Desktop" $otherText (Join-Path $raw "other.wav")
Write-Host "Wrote $Out\enroll.wav, $raw\user_test.wav, $raw\other.wav"
