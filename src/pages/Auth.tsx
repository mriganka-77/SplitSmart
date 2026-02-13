import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, DollarSign, ArrowRight, Chrome, Zap, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

// Custom Flying Character Animation - Iron Man
const FlyingCharacter = () => {
  return (
    <motion.div
      className="absolute text-6xl"
      animate={{
        x: [-200, 100, 200, -100, -200],
        y: [50, -100, -150, -50, 50],
        rotate: [0, 15, 30, 10, 0],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ top: '5%', right: '10%', zIndex: 20 }}
    >
      {/* Iron Man-like suit */}
      <div className="relative">
        {/* Glow effect */}
        <motion.div
          className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full blur-lg"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Main body */}
        <div className="relative w-20 h-24 mx-auto">
          {/* Chest reactor with pulse */}
          <motion.div
            className="absolute top-6 left-1/2 -translate-x-1/2 w-8 h-10 bg-gradient-to-b from-yellow-300 via-orange-400 to-red-500 rounded-lg border-2 border-yellow-200"
            animate={{
              boxShadow: [
                '0 0 20px rgba(250, 204, 21, 0.8)',
                '0 0 40px rgba(250, 204, 21, 1)',
                '0 0 20px rgba(250, 204, 21, 0.8)',
              ],
              scale: [1, 1.15, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 to-orange-300 rounded-lg opacity-70" />
          </motion.div>

          {/* Arms with repulsors */}
          <motion.div
            className="absolute top-8 left-0 w-3 h-8 bg-yellow-400 rounded-full"
            animate={{ rotate: [-20, 20, -20] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="absolute top-8 right-0 w-3 h-8 bg-yellow-400 rounded-full"
            animate={{ rotate: [20, -20, 20] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
          />

          {/* Face with eyes */}
          <motion.div className="absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6 bg-yellow-500 rounded-full border-2 border-yellow-600">
            <motion.div
              className="absolute w-2 h-2 bg-red-600 rounded-full top-1 left-1"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <motion.div
              className="absolute w-2 h-2 bg-red-600 rounded-full top-1 right-1"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0.1 }}
            />
          </motion.div>

          {/* Energy blast trail */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`beam-${i}`}
              className="absolute w-1 h-4 bg-gradient-to-b from-yellow-300 to-transparent right-2"
              style={{ bottom: `-${20 + i * 15}px` }}
              animate={{
                y: [-10, -40, -10],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Thor Greeting Animation
const ThorGreeting = () => {
  return (
    <motion.div
      className="absolute text-6xl"
      animate={{
        x: [0, 80, 0],
        y: [0, -60, 0],
        rotate: [0, -10, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ top: '15%', left: '10%', zIndex: 20 }}
    >
      {/* Thor glow */}
      <motion.div
        className="absolute -inset-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-lg"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />

      {/* Thor body */}
      <div className="relative">
        {/* Head */}
        <motion.div className="w-8 h-8 bg-yellow-600 rounded-full mx-auto border-2 border-yellow-700 mb-1">
          <motion.div
            className="absolute w-2 h-2 bg-white rounded-full top-2 left-1.5"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-2 h-2 bg-white rounded-full top-2 right-1.5"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.1 }}
          />
        </motion.div>

        {/* Body */}
        <div className="w-10 h-12 bg-gradient-to-b from-blue-500 to-blue-600 rounded-lg mx-auto border-2 border-blue-400 relative">
          {/* Cape */}
          <motion.div
            className="absolute -left-3 top-2 w-4 h-8 bg-red-600 rounded-r-full"
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>

        {/* Mjolnir (Hammer) */}
        <motion.div
          animate={{
            rotate: [0, 45, 90, 45, 0],
            x: [0, 50, 60, 50, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: 0.5,
          }}
          style={{ originX: '10px', originY: '10px' }}
          className="absolute -right-8 top-0 z-30"
        >
          <div className="w-12 h-4 bg-gray-400 rounded-full flex items-center justify-center border-2 border-gray-600">
            <div className="w-6 h-3 bg-gray-700 rounded-full" />
          </div>
        </motion.div>

        {/* "Hello!" Text */}
        <motion.div
          className="absolute -top-12 left-1/2 -translate-x-1/2 text-3xl font-bold text-blue-500 whitespace-nowrap"
          animate={{
            opacity: [0, 1, 1, 0],
            y: [-20, 0, 0, -20],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
          }}
        >
          👋
        </motion.div>
      </div>
    </motion.div>
  );
};

// Lightning Effect Animation
const LightningEffect = () => {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-32 bg-gradient-to-b from-blue-300 via-blue-200 to-transparent"
          animate={{
            opacity: [0, 0.9, 0],
            filter: [
              'drop-shadow(0 0 2px rgba(59, 130, 246, 0))',
              'drop-shadow(0 0 15px rgba(59, 130, 246, 0.8))',
              'drop-shadow(0 0 2px rgba(59, 130, 246, 0))',
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeIn',
          }}
          style={{
            left: `${5 + i * 10}%`,
            top: '-50px',
          }}
        />
      ))}
    </>
  );
};

// Sparkles Animation
const Sparkles = () => {
  return (
    <>
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full shadow-lg"
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
            x: [0, Math.cos((i * Math.PI) / 6) * 80],
            y: [0, Math.sin((i * Math.PI) / 6) * 80],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: i * 0.1,
          }}
          style={{
            left: '50%',
            top: '50%',
            marginLeft: '-4px',
            marginTop: '-4px',
          }}
        />
      ))}
    </>
  );
};

// Animated input wrapper
const AnimatedInput = ({ icon: Icon, error, ...props }: any) => {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="relative">
        <motion.div
          animate={{ scale: focused ? 1.1 : 1, color: focused ? '#3b82f6' : '#9ca3af' }}
          transition={{ duration: 0.2 }}
          className="absolute left-4 top-1/2 -translate-y-1/2"
        >
          <Icon className="w-5 h-5" />
        </motion.div>
        <motion.input
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          initial={{ borderColor: 'rgba(0,0,0,0.1)' }}
          animate={{
            borderColor: focused ? '#3b82f6' : error ? '#ef4444' : 'rgba(0,0,0,0.1)',
            boxShadow: focused
              ? '0 0 0 3px rgba(59, 130, 246, 0.1)'
              : 'none',
          }}
          transition={{ duration: 0.2 }}
          className="w-full pl-12 pr-4 py-3 h-12 bg-secondary/50 border-2 rounded-xl outline-none transition-all"
          {...props}
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-destructive text-sm mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reason = searchParams.get('reason');
  const redirectParam = searchParams.get('redirect');
  const redirectTo = (() => {
    if (!redirectParam) return '/dashboard';
    try {
      return decodeURIComponent(redirectParam);
    } catch {
      return '/dashboard';
    }
  })();

  useEffect(() => {
    if (reason === 'auth') {
      toast.error('Session expired. Please sign in again.');
    }
  }, [reason]);

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

  const validateForm = () => {
    try {
      if (isSignUp) {
        signUpSchema.parse({ email, password, fullName });
      } else {
        signInSchema.parse({ email, password });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            newErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Welcome to SplitSmart!');
          navigate(redirectTo, { replace: true });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Welcome back!');
          navigate(redirectTo, { replace: true });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-auth flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Flying character animations */}
        <FlyingCharacter />
        <ThorGreeting />

        {/* Lightning effects */}
        <LightningEffect />

        {/* Floating background elements */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute -top-1/3 -right-1/3 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 7, repeat: Infinity }}
          className="absolute -bottom-1/3 -left-1/3 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-3xl"
        />

        {/* Floating energy orbs */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute w-2 h-2 bg-blue-400 rounded-full"
            animate={{
              y: [0, -40, 0],
              x: [0, Math.sin((i * Math.PI) / 2) * 30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.5,
            }}
            style={{
              left: `${25 + i * 20}%`,
              top: '60%',
              filter: 'blur(1px)',
            }}
          />
        ))}

        {/* Animated stars */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-yellow-300 rounded-full"
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
            style={{
              left: `${15 + i * 12}%`,
              top: `${30 + Math.random() * 20}%`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo section */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center mb-8 relative"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-16 h-16 rounded-2xl gradient-primary shadow-lg flex items-center justify-center mb-4 relative overflow-hidden"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
            />
            <DollarSign className="w-8 h-8 text-primary-foreground relative z-10" />
            <Sparkles />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-display font-bold text-gradient"
          >
            SplitSmart
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-sm mt-2 flex items-center gap-2"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-4 h-4 text-yellow-500" />
            </motion.span>
            Smart expense splitting made epic
            <motion.span
              animate={{ rotate: [0, -360] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Lightbulb className="w-4 h-4 text-yellow-400" />
            </motion.span>
          </motion.p>
        </motion.div>

        {/* Auth card with glass effect */}
        <motion.div
          layout
          className="glass-strong rounded-3xl p-8 shadow-2xl backdrop-blur-md relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Animated border glow */}
          <motion.div
            className="absolute inset-0 rounded-3xl"
            animate={{
              boxShadow: [
                'inset 0 0 20px rgba(59, 130, 246, 0.1)',
                'inset 0 0 40px rgba(59, 130, 246, 0.3)',
                'inset 0 0 20px rgba(59, 130, 246, 0.1)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            pointerEvents="none"
          />
          {/* Toggle tabs */}
          <div className="flex gap-2 mb-8 p-1 bg-secondary/50 rounded-xl relative z-10">
            <motion.button
              onClick={() => setIsSignUp(false)}
              layout
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                !isSignUp
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </motion.button>
            <motion.button
              onClick={() => setIsSignUp(true)}
              layout
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                isSignUp
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </motion.button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <AnimatePresence mode="wait">
              {isSignUp && (
                <motion.div
                  key="fullName"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <AnimatedInput
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e: any) => setFullName(e.target.value)}
                    icon={User}
                    error={errors.fullName}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatedInput
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
              icon={Mail}
              error={errors.email}
            />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="relative">
                <motion.div
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  animate={{ color: '#9ca3af' }}
                >
                  <Lock className="w-5 h-5" />
                </motion.div>
                <motion.input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 h-12 bg-secondary/50 border-2 border-border/50 rounded-xl outline-none focus:border-primary focus:shadow-sm transition-all"
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-destructive text-sm mt-1"
                  >
                    {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              layout
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-12 gradient-primary text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all relative overflow-hidden mt-6"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoading ? 1 : 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                />
              </motion.div>
              <motion.div
                animate={{ opacity: isLoading ? 0 : 1 }}
                className="flex items-center justify-center gap-2"
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight className="w-5 h-5" />
              </motion.div>
            </motion.button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-secondary/50 px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Google sign in button */}
          <motion.button
            type="button"
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true);
              try {
                const { error } = await signInWithGoogle();
                if (error) {
                  toast.error(error.message || 'Failed to sign in with Google');
                }
              } finally {
                setIsLoading(false);
              }
            }}
            className="w-full h-12 flex items-center justify-center gap-3 px-4 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Chrome className="w-5 h-5" />
            <span>Google</span>
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-muted-foreground text-xs mt-6"
        >
          By continuing, you agree to our Terms & Privacy Policy
        </motion.p>
      </motion.div>
    </div>
  );
}
