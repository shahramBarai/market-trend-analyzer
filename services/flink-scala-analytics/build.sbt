lazy val flinkScalaAnalytics = (project in file("."))
  .settings(
    scalaVersion := "2.12.20",
    name := "flink-scala-analytics",
    libraryDependencies ++= Seq(
      "org.apache.flink" %% "flink-scala" % "1.14.0",
      "org.apache.flink" %% "flink-streaming-scala" % "1.14.0",
      "org.apache.flink" %% "flink-connector-kafka" % "1.14.0",
      "org.apache.kafka" % "kafka-clients" % "2.8.0",
      "org.slf4j" % "slf4j-api" % "1.7.32",
      "org.slf4j" % "slf4j-log4j12" % "1.7.32",
      "com.google.protobuf" % "protobuf-java" % "3.21.9"
    ),
    Compile / PB.targets := Seq(
      scalapb.gen() -> (Compile / sourceManaged).value / "scalapb"
    ),
    Compile / PB.protoSources := Seq(file("../../shared")),
    Compile / PB.protocExecutable := {
      sys.env.get("PROTOC_PATH") match {
        case Some(path) => file(path)
        case None => (Compile / PB.protocExecutable).value
      }
    }
  )