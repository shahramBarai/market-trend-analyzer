lazy val root = (project in file("."))
  .aggregate(flinkScalaAnalytics)
  .settings(
    scalaVersion := "2.12.20",
    name := "market-trend-analyzer",
  )

lazy val flinkScalaAnalytics = project
  .in(file("services/flink-scala-analytics"))