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

variable "openrouter_api_key" {
  description = "OpenRouter API key for AI text generation via openrouter/fusion"
  type        = string
  default     = ""
  sensitive   = true
}
