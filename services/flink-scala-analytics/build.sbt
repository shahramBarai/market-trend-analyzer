lazy val flinkScalaAnalytics = (project in file("."))
  .settings(
    scalaVersion := "2.12.20",
    name := "flink-scala-analytics",
    libraryDependencies ++= Seq(
      "org.apache.flink" %% "flink-scala" % "1.14.6",
      "org.apache.flink" %% "flink-streaming-scala" % "1.14.6",
      "org.apache.flink" %% "flink-clients" % "1.14.6",
      "org.apache.flink" %% "flink-connector-kafka" % "1.14.6",
      "org.apache.flink" %% "flink-connector-jdbc" % "1.14.6",
      "org.apache.kafka" % "kafka-clients" % "2.8.0",
      "org.apache.logging.log4j" % "log4j-core" % "2.20.0",
      "org.apache.logging.log4j" % "log4j-slf4j-impl" % "2.20.0",
      "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion % "protobuf",
      "com.google.protobuf" % "protobuf-java" % "3.21.9",
      "org.postgresql" % "postgresql" % "42.7.4",
    ),
    Compile / PB.targets := Seq(
      scalapb.gen() -> (Compile / sourceManaged).value / "scalapb"
    ),
    Compile / PB.protoSources := Seq(baseDirectory.value / "../../shared"),
  )
