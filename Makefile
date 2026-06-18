# Convenience shortcuts. Run `make help` to list targets.
.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help up down build logs restart ps test seed-reset

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Build and start the full stack
	$(COMPOSE) up --build -d
	@echo "Frontend: http://localhost:3000  |  API docs: http://localhost:8000/docs"

down: ## Stop and remove containers
	$(COMPOSE) down

build: ## Build images without starting
	$(COMPOSE) build

logs: ## Tail logs from all services
	$(COMPOSE) logs -f

restart: ## Restart all services
	$(COMPOSE) restart

ps: ## Show running services
	$(COMPOSE) ps

test: ## Run backend tests inside a disposable container
	docker run --rm -v $(PWD)/backend:/app -w /app python:3.12-slim \
	  sh -c "pip install -q -r requirements.txt && pytest"

seed-reset: ## Wipe the database volume and restart (re-seeds sample data)
	$(COMPOSE) down -v
	$(COMPOSE) up --build -d
