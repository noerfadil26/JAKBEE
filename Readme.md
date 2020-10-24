### AUTH
## POST /auth/login
   {
      email: String,
      password: String Bcrypt(),
   }

## POST /auth/register
   {
      name: String,
      email: String,
      password: String Bcrypt(),
      tnc: Boolean
   }
 
## GET /user/logout
   header { JWTToken }

### SERVICES
## GET /user/info
   header { JWTToken }

## GET /user/state
   header { JWTToken }


