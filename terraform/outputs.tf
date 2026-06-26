locals {
  base_url = trimsuffix(aws_apigatewayv2_stage.default.invoke_url, "/")
}

output "base_url" {
  description = "Public API base URL"
  value       = local.base_url
}

output "health_url" {
  description = "Health check endpoint"
  value       = "${local.base_url}/health"
}

output "api_url" {
  description = "Analyze-ticket endpoint"
  value       = "${local.base_url}/analyze-ticket"
}

output "lambda_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.api.arn
}
