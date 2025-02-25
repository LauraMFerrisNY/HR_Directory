const express = require('express')
const app = express()
const pg = require('pg')
const client = new pg.Client(
  process.env.DATABASE_URL || 'postgresql://lauraunix:xinu2413@localhost:5432/acme_hr_directory_db'
)
const port = process.env.PORT || 3000

app.use(express.json())
app.use(require('morgan')('dev'))
app.use((error, req, res, next) => {
  res.status(res.status || 500).send({error: error});
})

app.get('/api/departments', async (req, res, next) => {
  try {
    const SQL = `
      SELECT * from departments
    `
    const response = await client.query(SQL)
    res.send(response.rows)
  } catch (ex) {
    next(ex)
  }
})

app.get('/api/employees', async (req, res, next) => {
  try {
    const SQL = `
      SELECT * from employees ORDER BY created_at DESC;
    `
    const response = await client.query(SQL)
    res.send(response.rows)
  } catch (ex) {
    next(ex)
  }
})

app.post('/api/employees', async (req, res, next) => {
  try {
    const SQL = `
      INSERT INTO employees(name, department_id)
      VALUES($1, $2)
      RETURNING *
    `
    const response = await client.query(SQL, [req.body.name, req.body.department_id])
    res.send(response.rows[0])
  } catch (ex) {
    next(ex)
  }
})

app.put('/api/employees/:id', async (req, res, next) => {
  try {
    const SQL = `
      UPDATE employees
      SET name=$1, department_id=$2, updated_at= now()
      WHERE id=$3 RETURNING *
    `
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
      req.params.id
    ])
    res.send(response.rows[0])
  } catch (ex) {
    next(ex)
  }
})

app.delete('/api/employees/:id', async (req, res, next) => {
  try {
    const SQL = `
      DELETE from employees
      WHERE id = $1
    `
    const response = await client.query(SQL, [req.params.id])
    res.sendStatus(204)
  } catch (ex) {
    next(ex)
  }
})

const init = async () => {
  await client.connect()
  let SQL = `
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS departments;
    CREATE TABLE departments(
      id SERIAL PRIMARY KEY,
      name VARCHAR(100)
    );
    CREATE TABLE employees(
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now(),
      department_id INTEGER REFERENCES departments(id) NOT NULL
    );
  `
  await client.query(SQL)
  console.log('tables created')
  SQL = `
    INSERT INTO departments(name) VALUES('Sales');
    INSERT INTO departments(name) VALUES('Customer Service');
    INSERT INTO departments(name) VALUES('NOC');
    INSERT INTO employees(name, department_id) VALUES('Laura Ferris', (SELECT id FROM departments WHERE name='NOC'));
    INSERT INTO employees(name, department_id) VALUES('Veronica Smith', (SELECT id FROM departments WHERE name='Customer Service'));
    INSERT INTO employees(name, department_id) VALUES('Alex Martin', (SELECT id FROM departments WHERE name='Sales'));
    INSERT INTO employees(name, department_id) VALUES('Dustin Myers', (SELECT id FROM departments WHERE name='NOC'));
    INSERT INTO employees(name, department_id) VALUES('Genevieve Johnson', (SELECT id FROM departments WHERE name='Sales'));
    INSERT INTO employees(name, department_id) VALUES('Mark Hendricks', (SELECT id FROM departments WHERE name='Customer Service'));
  `
  await client.query(SQL)
  console.log('data seeded')
  app.listen(port, () => console.log(`listening on port ${port}`))
}

init()