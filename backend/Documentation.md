* in backend folder, create a new virtual environment
  * python -m venv .venv

* select / activate virutal environment:
  * .venv\Scripts\activate

* Install all the dependencies in [requirements.txt](requirements.txt) file
  * pip install -r requirements.txt

* Test backend by running:
  * uvicorn app.main:app --reload
* API documentation available at: 
  * http://127.0.0.1:8000/docs

* When there's a new version of the DB, run this command (In backend folder):
  * alembic revision --autogenerate -m "some version comment here, like 'added operator model'"
* Creates the new tables
  * alembic upgrade head

* For Railway deployment:
  * Set DATABASE_URL in Railway service variables to Postgres URL.
  * Redeploy; migrations run automatically via railway.json startCommand - so no need to manually update the tables there.

* Widget delivery env vars:
  * `PUBLIC_BASE_URL` - optional, overrides origin used when generating widget links.
  * `WIDGET_CACHE_SECONDS` - cache lifetime for `/widget.js` responses (default 300 seconds).
  * `CORS_ALLOW_ORIGINS` - comma-separated list of allowed origins (defaults to `*`).