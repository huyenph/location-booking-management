COMPOSE := docker compose

.PHONY: up down build logs db-shell migrate seed test restart clean

up: ## Start postgres + backend containers in the background
	$(COMPOSE) up -d

down: ## Stop and remove containers
	$(COMPOSE) down

build: ## Build (or rebuild) the backend image
	$(COMPOSE) build

logs: ## Tail backend logs
	$(COMPOSE) logs -f backend

db-shell: ## Open a psql shell in the postgres container
	$(COMPOSE) exec postgres psql -U $${DB_USER:-sjgroup} -d $${DB_NAME:-sjgroup}

migrate: ## Run TypeORM migrations inside the backend container
	$(COMPOSE) exec backend npm run migration:run

seed: ## Load the sample Building A / B location tree
	$(COMPOSE) exec backend npm run seed

test: ## Run Jest unit tests locally (host)
	npm run test

restart: down up ## Restart the whole stack

clean: ## Stop containers AND wipe the postgres volume (fresh DB)
	$(COMPOSE) down -v
