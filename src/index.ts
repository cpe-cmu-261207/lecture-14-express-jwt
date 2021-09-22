declare global {
  namespace Express {
    interface Request {
      username: string;
    }
  }
}

import express, { Request, Response, NextFunction } from 'express'
import auth from 'basic-auth'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const app = express()
app.use(express.json())
app.use(express.urlencoded({
  extended: true
}));

type User = {
  username: string
  password: string
  money: number
}

const users: User[] = [
  {
    username: 'admin',
    password: '$2b$10$Dd.nG.LjomTtBkBDA85k3uOvlupXuGzg0UO1q41.D2scybLlGkIaW',
    money: 100
  },
  {
    username: 'test1',
    password: '$2b$10$c5idcDJuZfXl3fFTBpac/.OjYk85S.Pkb67wt7taqntkrfKzZDZca',
    money: 50
  }
]

const SECRET = 'mysecret'

type MyJwtPayload = {
  username: string
} & jwt.JwtPayload

app.get('/login', async (req, res) => {
  const user = auth(req)
  if (!user) return res.status(404).json({ status: 'failed' })

  const username = user.name
  const password = user.pass

  //check username & password
  const foundUser = users.find(x => x.username === username && bcrypt.compareSync(password, x.password))
  if (!foundUser) return res.status(404).json({ status: 'failed' })

  const token = jwt.sign({ username }, SECRET, { expiresIn: '1800s' })
  return res.json({ status: 'success', token })
})

//protected route without middleware
// app.get('/money', async (req, res) => {
//   const bearerHeader = req.headers['authorization']
//   if (bearerHeader) {
//     const splited = bearerHeader.split(' ')
//     const token = splited[1]

//     try {
//       const decoded = jwt.verify(token, SECRET) as MyJwtPayload
//       const username = decoded.username
//       const money = users[username].money

//       return res.json({ status: 'success', username, money })
//     }
//     catch (err) {
//       console.error(err)
//       return res.status(401).json({ status: 'failed' })
//     }
//   }
//   else
//     return res.status(401).json({ status: 'failed' })
// })

// app.post('/topup', async (req, res) => {
//   const bearerHeader = req.headers['authorization']
//   if (bearerHeader){
//     const splited = bearerHeader.split(' ')
//     const token = splited[1]

//     try{
//       const decoded = jwt.verify(token, SECRET) as MyJwtPayload
//       const username = decoded.username

//       const topupAmount = req.body.amount
//       users[username].money += topupAmount
//       const money = users[username].money

//       return res.json({status: 'success', username, money})
//     }
//     catch(err){
//       console.error(err)
//       return res.status(401).json({status: 'failed'})
//     }
//   }
//   else
//     return res.status(401).json({status: 'failed'}) 
// })

//protected route with middleware
const checkToken = async (req: Request, res: Response, next: NextFunction) => {
  const bearerHeader = req.headers['authorization']
  if (bearerHeader) {
    const splited = bearerHeader.split(' ')
    const token = splited[1]

    try {
      const decoded = jwt.verify(token, SECRET) as MyJwtPayload
      const username = decoded.username
      req.username = username
      next()
    } catch {
      return res.status(401).json({ status: 'failed'})
    }
  }
  else
    return res.status(401).json({ status: 'failed' })
}

app.get('/money', checkToken, async (req, res) => {
  const foundUser = users.find(x => x.username === req.username) as User
  return res.json({
    status: 'success',
    username: foundUser.username,
    money: foundUser.money
  })
})

app.post('/topup', checkToken, (req: Request, res: Response) => {

  const username = req.username
  const amount = req.body.amount
  const foundUser = users.find(x => x.username === req.username) as User
  foundUser.money += amount

  return res.json({
    status: 'success',
    username,
    money: foundUser.money
  })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log('Server is running at port ' + port)
})
