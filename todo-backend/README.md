# Todo App — Backend (AWS Lambda + Python)

Serverless REST API built with AWS SAM, API Gateway, Lambda (Python 3.12), and DynamoDB.

## Endpoints

| Method | Path          | Description       |
|--------|---------------|-------------------|
| GET    | /todos        | List all todos    |
| POST   | /todos        | Create a todo     |
| PUT    | /todos/{id}   | Update a todo     |
| DELETE | /todos/{id}   | Delete a todo     |

## Local Development

```bash
# Install SAM CLI: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

cd todo-backend

# Build
sam build

# Run locally (requires Docker)
sam local start-api --env-vars env.json

# Deploy to AWS
sam deploy --guided --parameter-overrides Stage=dev
```

## Environment Variables

| Variable        | Description                        | Default |
|-----------------|------------------------------------|---------|
| `TODOS_TABLE`   | DynamoDB table name (auto-set)     | —       |
| `ALLOWED_ORIGINS` | CORS allowed origins             | `*`     |

## Project Structure

```
todo-backend/
├── handlers/
│   └── todos.py        # Lambda handler (GET/POST/PUT/DELETE)
├── template.yaml       # SAM / CloudFormation template
├── requirements.txt    # Python dependencies
└── README.md
```
