.PHONY: run stop install build deploy clean

# Runs the Vite development server
run:
	npm run dev

# Stops any running Vite processes (mac/linux)
stop:
	pkill -f vite || echo "No vite process running"

# Installs project dependencies
install:
	npm install

# Builds the app for production
build:
	npm run build

# Deploys the app to Firebase Hosting
deploy: build
	npx firebase deploy --only hosting

# Cleans up the node_modules and dist directories
clean:
	rm -rf node_modules
	rm -rf dist
	npm cache clean --force
