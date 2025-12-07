/*
 * MQ2 Gas Sensor - Arduino Code
 * 
 * Connections:
 * - MQ2 VCC  → Arduino 5V
 * - MQ2 GND  → Arduino GND
 * - MQ2 AOUT → Arduino A0 (Analog pin)
 * - MQ2 DOUT → Arduino D2 (Digital pin - optional for threshold alert)
 * 
 * The MQ2 sensor can detect:
 * - LPG, Propane, Hydrogen
 * - Methane, Natural Gas
 * - Smoke, Alcohol
 */

const int MQ2_ANALOG_PIN = A0;      // Analog output from MQ2
const int MQ2_DIGITAL_PIN = 2;       // Digital output from MQ2 (threshold alert)
const int LED_ALERT_PIN = 13;        // Built-in LED for visual alert
const int BUZZER_PIN = 8;            // Optional buzzer for audio alert

// Thresholds (adjust based on your calibration)
const int GAS_THRESHOLD_WARNING = 300;   // Warning level
const int GAS_THRESHOLD_DANGER = 500;    // Danger level

// Sensor warm-up time (MQ2 needs ~2 minutes to stabilize)
const unsigned long WARMUP_TIME = 120000; // 2 minutes in milliseconds

unsigned long startTime;
bool isWarmedUp = false;

void setup() {
  Serial.begin(9600);
  
  pinMode(MQ2_ANALOG_PIN, INPUT);
  pinMode(MQ2_DIGITAL_PIN, INPUT);
  pinMode(LED_ALERT_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  startTime = millis();
  
  // Initial message
  Serial.println("{\"status\":\"warming_up\",\"message\":\"MQ2 sensor warming up...\"}");
}

void loop() {
  // Check if sensor is warmed up
  if (!isWarmedUp) {
    if (millis() - startTime >= WARMUP_TIME) {
      isWarmedUp = true;
      Serial.println("{\"status\":\"ready\",\"message\":\"MQ2 sensor ready\"}");
    } else {
      // Send warm-up progress
      int progress = ((millis() - startTime) * 100) / WARMUP_TIME;
      Serial.print("{\"status\":\"warming_up\",\"progress\":");
      Serial.print(progress);
      Serial.println("}");
      delay(1000);
      return;
    }
  }
  
  // Read sensor values
  int analogValue = analogRead(MQ2_ANALOG_PIN);
  int digitalValue = digitalRead(MQ2_DIGITAL_PIN);
  
  // Calculate approximate PPM (this is a rough estimation)
  // For accurate readings, proper calibration is needed
  float voltage = analogValue * (5.0 / 1023.0);
  float ppm = map(analogValue, 0, 1023, 0, 10000);
  
  // Determine status
  String alertLevel = "normal";
  if (analogValue >= GAS_THRESHOLD_DANGER) {
    alertLevel = "danger";
    digitalWrite(LED_ALERT_PIN, HIGH);
    tone(BUZZER_PIN, 1000); // Sound alarm
  } else if (analogValue >= GAS_THRESHOLD_WARNING) {
    alertLevel = "warning";
    digitalWrite(LED_ALERT_PIN, (millis() / 500) % 2); // Blink LED
    noTone(BUZZER_PIN);
  } else {
    alertLevel = "normal";
    digitalWrite(LED_ALERT_PIN, LOW);
    noTone(BUZZER_PIN);
  }
  
  // Send JSON data over serial
  Serial.print("{");
  Serial.print("\"type\":\"gas_reading\",");
  Serial.print("\"sensor\":\"MQ2\",");
  Serial.print("\"raw\":");
  Serial.print(analogValue);
  Serial.print(",\"voltage\":");
  Serial.print(voltage, 2);
  Serial.print(",\"ppm\":");
  Serial.print(ppm, 0);
  Serial.print(",\"digital\":");
  Serial.print(digitalValue);
  Serial.print(",\"alert\":\"");
  Serial.print(alertLevel);
  Serial.print("\",\"thresholds\":{");
  Serial.print("\"warning\":");
  Serial.print(GAS_THRESHOLD_WARNING);
  Serial.print(",\"danger\":");
  Serial.print(GAS_THRESHOLD_DANGER);
  Serial.println("}}");
  
  delay(500); // Send data every 500ms
}

