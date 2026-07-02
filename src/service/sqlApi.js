import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

export function testSqlConnection() {
  return api.get('/test-connect')
}