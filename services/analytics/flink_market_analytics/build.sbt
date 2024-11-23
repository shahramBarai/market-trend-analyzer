scalaVersion := "2.12.10"

libraryDependencies ++= Seq(
  "org.apache.flink" %% "flink-scala" % "1.14.0",
  "org.apache.flink" %% "flink-streaming-scala" % "1.14.0",
  "org.apache.flink" %% "flink-connector-kafka" % "1.14.0",
  "org.apache.kafka" % "kafka-clients" % "2.8.0",
  "org.slf4j" % "slf4j-api" % "1.7.32",
  "org.slf4j" % "slf4j-log4j12" % "1.7.32",
  "com.thesamet.scalapb" %% "scalapb-runtime" % "0.11.13" % "protobuf",
  "com.google.protobuf" % "protobuf-java" % "3.21.9"
)

PB.targets in Compile := Seq(
  scalapb.gen() -> (Compile / sourceManaged).value
)

scalacOptions ++= Seq("-deprecation", "-feature", "-unchecked", "-encoding", "utf8")

fork := true

// Assembly settings
Compile / assemblyOption in assembly := (assemblyOption in assembly).value

Compile / packageBin / mainClass := Some("RegionalMarketAnalytics")

// Set source directory for Protobuf files
Compile / PB.includePaths := Seq(baseDirectory.value / "src/main/protobuf")

// Set Protobuf compiler version
ThisBuild / PB.protocVersion := "3.21.9"