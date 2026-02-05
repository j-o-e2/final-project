import { createClient } from "./supabaseClient.js"

export async function testSupabaseConnection() {
  try {
    const supabase = createClient()

    // Test the connection by fetching auth status
    const {
      data: { session },
    } = await supabase.auth.getSession()

    console.log("Supabase connection successful!")
    console.log("Current session:", session)

    return {
      success: true,
      message: "Connected to Supabase successfully",
      session: session,
    }
  } catch (error) {
    console.error("Supabase connection failed:", error)
    return {
      success: false,
      message: "Failed to connect to Supabase",
      error: error.message,
    }
  }
}

// Test signup
export async function testSignup(email, password) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error

    console.log("Signup successful!", data)
    return {
      success: true,
      message: "Signup successful",
      data: data,
    }
  } catch (error) {
    console.error("Signup failed:", error)
    return {
      success: false,
      message: "Signup failed",
      error: error.message,
    }
  }
}

// Test login
export async function testLogin(email, password) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    console.log("Login successful!", data)
    return {
      success: true,
      message: "Login successful",
      data: data,
    }
  } catch (error) {
    console.error("Login failed:", error)
    return {
      success: false,
      message: "Login failed",
      error: error.message,
    }
  }
}
