lazy val root = (project in file("."))
  .aggregate(flinkScalaAnalytics)
  .settings(
    name := "market-trend-analyzer"
  )

lazy val flinkScalaAnalytics = project
  .settings(
    name := "flink-scala-analytics"
  )
  .in(file("services/flink-scala-analytics"))