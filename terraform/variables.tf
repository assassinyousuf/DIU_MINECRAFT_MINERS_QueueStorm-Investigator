variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-1"
}

variable "lambda_zip_path" {
  description = "Path to the Lambda deployment zip file"
  type        = string
  default     = "C:/Users/User/AppData/Local/Temp/queuestorm-lambda.zip"
}

variable "anthropic_api_key" {
  description = "Anthropic API key for Claude Haiku text generation (optional)"
  type        = string
  default     = ""
  sensitive   = true
}
