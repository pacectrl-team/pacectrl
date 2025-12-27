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

* Auth quick tests (local):
  * Login: `curl -X POST "http://127.0.0.1:8000/api/v1/operator/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"your-password"}'`
  * Who am I: `curl "http://127.0.0.1:8000/api/v1/operator/auth/me" -H "Authorization: Bearer <token>"`

* When there's a new version of the DB, run this command (In backend folder):
  * alembic revision --autogenerate -m "some version comment here, like 'added operator model'"
* Creates the new tables
  * alembic upgrade head

* For Railway deployment:
  * Set DATABASE_URL in Railway service variables to Postgres URL.
  * Redeploy; migrations run automatically via railway.json startCommand - so no need to manually update the tables there.